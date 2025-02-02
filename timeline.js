// timeline.js

// Set up the SVG and dimensions.
const svg = d3.select("#timeline-svg");
const container = document.getElementById("timeline-container");
const width = container.clientWidth;
const height = container.clientHeight;
svg.attr("width", width).attr("height", height);

// Timeline configuration:
const currentYear = 2025;
const initialSpan = 100; // Initially show roughly the last 100 years.
const initialDomain = [currentYear - initialSpan, currentYear];

// (The full timeline will eventually span from the Big Bang to the current year,
// but we start with a "zoomed in" view.)
const fullDomain = [-300000, currentYear];

// Add configuration for the navigation timeline
const navTimelineHeight = 30; // Height for the navigation timeline
const mainTimelineHeight = height - navTimelineHeight - 20; // Leave some padding

// Create a scale for the navigation timeline (always shows full domain)
const navScale = d3.scaleLinear()
    .domain(fullDomain)
    .range([50, width - 50]);

// Create a linear scale mapping years to x-coordinates.
let xScale = d3.scaleLinear()
  .domain(initialDomain)
  .range([50, width - 50]);  // add margins on left/right

// Create a group for the timeline.
const timelineGroup = svg.append("g")
    .attr("class", "timeline-group")
    .attr("transform", "translate(0, 0)");

// Create a group for the navigation timeline
const navGroup = svg.append("g")
    .attr("class", "nav-timeline-group")
    .attr("transform", `translate(0, ${height - navTimelineHeight})`);

// Add a group for the axis below the timeline
const axisGroup = timelineGroup.append("g")
  .attr("class", "axis-group")
  .attr("transform", `translate(0, ${height/2 + 20})`);

// Create axis generator
const xAxis = d3.axisBottom(xScale);

// Draw the main horizontal timeline line.
const timelineLine = timelineGroup.append("line")
  .attr("x1", xScale(initialDomain[0]))
  .attr("x2", xScale(initialDomain[1]))
  .attr("y1", height/2)
  .attr("y2", height/2)
  .attr("stroke", "#000")
  .attr("stroke-width", 2);

// Create a group to hold event markers.
const eventsGroup = timelineGroup.append("g").attr("class", "events-group");

// Draw the navigation timeline base line
const navLine = navGroup.append("line")
    .attr("x1", navScale(fullDomain[0]))
    .attr("x2", navScale(fullDomain[1]))
    .attr("y1", 0)
    .attr("y2", 0)
    .attr("stroke", "#ccc")
    .attr("stroke-width", 2);

// Add the highlight rect for the visible region
const visibleRegion = navGroup.append("rect")
    .attr("class", "visible-region")
    .attr("height", 4)
    .attr("y", -2)
    .attr("fill", "#0000ff");

// Set up a tooltip element for event descriptions.
const tooltip = d3.select("#tooltip");

// Function to update (or re-render) the timeline and its events based on the current zoom/pan transform.
function updateTimeline(transform) {
  // Create a new rescaled xScale based on the current zoom transform.
  const newXScale = transform.rescaleX(xScale);

  // Calculate the visible domain boundaries
  const visibleDomain = newXScale.domain();
  console.log(visibleDomain);
  const domainSpan = visibleDomain[1] - visibleDomain[0];
  const pxPerYear = (width - 100) / domainSpan;
  

  // Add back the constants
  const minPxPerYearForFullVisibility = 0.01;
  const maxPxPerYearForFullVisibility = 2;

  // Calculate x-coordinates for timeline endpoints
  const x1 = Math.max(50, newXScale(Math.min(visibleDomain[0], fullDomain[0])));
  // Always base x2 on the current year, so the timeline always reaches 2025.
  const x2 = Math.min(width - 50, newXScale(currentYear));

  // Update the timeline line's endpoints
  timelineLine
    .attr("x1", x1)
    .attr("x2", x2);

  // Filter events with adaptive density based on zoom level
  const visibleEvents = historicalEvents.filter(d => {
    // Basic domain check
    if (d.year < newXScale.domain()[0] || d.year > newXScale.domain()[1]) {
      return false;
    }
    
    // When very zoomed out, only show major events
    if (pxPerYear < 0.1) {
      return d.importance === 'major'; // Assuming events have an importance property
    }
    
    return true;
  });

  // Bind the filtered events to groups.
  const eventsSelection = eventsGroup.selectAll(".event")
    .data(visibleEvents, d => d.title);

  // Remove any events that are no longer in the view.
  eventsSelection.exit().remove();

  // Append new event groups.
  const eventEnter = eventsSelection.enter()
    .append("g")
    .attr("class", "event")
    .attr("transform", d => `translate(${newXScale(d.year)}, ${height / 2})`);

  // Draw a vertical line marker for each event.
  eventEnter.append("line")
    .attr("class", "event-line")
    .attr("y1", 0)
    .attr("y2", -30)
    .attr("stroke", "#333")
    .attr("stroke-width", 1);

  // Append text showing only the event title.
  // A mouseover shows a tooltip with the event's description.
  eventEnter.append("text")
    .attr("class", "event-text")
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text(d => `${d.title}`)
    .append("tspan")
    .attr("x", 0)
    .attr("dy", "1.2em")
    .text(d => d.year < 0 ? `${Math.abs(d.year)} BCE` : d.year)
    .on("mouseover", function(event, d) {
      tooltip
        .style("left", (event.pageX + 5) + "px")
        .style("top", (event.pageY - 28) + "px")
        .style("opacity", 1)
        .html(`<strong>${d.title}</strong><br>${d.description}`);
    })
    .on("mouseout", function() {
      tooltip.style("opacity", 0);
    });

  // Update the positions of all events and adjust label opacity based on zoom level.
  eventsGroup.selectAll(".event")
    .attr("transform", d => `translate(${newXScale(d.year)}, ${height / 2})`)
    .select(".event-text")
    .style("opacity", () => {
      // Linearly map pxPerYear to an opacity value between 0 and 1.
      let opacity = (pxPerYear - minPxPerYearForFullVisibility) / 
                    (maxPxPerYearForFullVisibility - minPxPerYearForFullVisibility);
      return Math.max(0, Math.min(1, opacity));
    });

  // Create custom ticks array with just start and end values
  const customTicks = [visibleDomain[0], visibleDomain[1]];
  
  // Update the axis with only start and end ticks
  xAxis.scale(newXScale)
    .tickValues(customTicks)
    .tickFormat(d => {
        const year = Math.round(d);
        return year < 0 ? `${Math.abs(year)} BCE` : year;
    });


  axisGroup.call(xAxis);

  // Remove the tick opacity styling since we always want to show these ticks
  axisGroup.selectAll(".tick text")
    .style("opacity", 1);

  // Update the visible region indicator on the navigation timeline
  const minHighlightWidth = 1; // Minimum width in pixels
  visibleRegion
    .attr("x", navScale(visibleDomain[0]))
    .attr("width", Math.max(
      minHighlightWidth,
      navScale(visibleDomain[1]) - navScale(visibleDomain[0])
    ));
}

// Calculate the maximum zoom level where 1 year takes up half the width
const maxZoom = (width / 2) / (xScale(1) - xScale(0));

// Calculate the minimum zoom level where the full timeline just fits
const minZoom = (width - 100) / (fullDomain[1] - fullDomain[0]) / ((width - 100) / (initialDomain[1] - initialDomain[0]));

// Set up pinned flags to detect if an edge is "anchored"
let pinnedRight = false;
let pinnedLeft = false;
// Store the previous transform to differentiate between zooming and panning actions.
let prevTransform = d3.zoomIdentity;

// Set up D3's zoom behavior.
// (Note we remove the previous .translateExtent so that our custom logic governs panning.)
const zoom = d3.zoom()
  .scaleExtent([minZoom, maxZoom])
  .on("start", (event) => {
    // Get the current transform (this is the one from our SVG)
    const currentTransform = d3.zoomTransform(svg.node());
    const currentXScale = currentTransform.rescaleX(xScale);
    // If the current transform is nearly showing the currentYear at the right edge...
    if (Math.abs(currentXScale(currentYear) - (width - 50)) < 10) {
      pinnedRight = true;
    }
    // (Similarly, you can test for the left edge if desired.)
    if (Math.abs(currentXScale(fullDomain[0]) - 50) < 10) {
      pinnedLeft = true;
    }
  })
  .on("zoom", (event) => {
    let transform = event.transform;

    // Determine whether this event is a zoom (scaling) action or a pure pan.
    const scaleChanged = Math.abs(transform.k - prevTransform.k) > 0.01;

    if (scaleChanged) {
      // When zooming and the edge was pinned, enforce the pin.
      if (pinnedRight) {
        transform.x = (width - 50) - transform.k * xScale(currentYear);
      }
      if (pinnedLeft) {
        transform.x = 50 - transform.k * xScale(fullDomain[0]);
      }
    } else {
      // If it's only a pan, release the pin so that the user can move away from the edge.
      pinnedRight = false;
      pinnedLeft = false;
    }

    // Clamp the transform so the visible domain does not exceed the full timeline.
    const newXScale = transform.rescaleX(xScale);
    const [visibleMin, visibleMax] = newXScale.domain();

    if (visibleMax > currentYear) {
      transform.x = (width - 50) - transform.k * xScale(currentYear);
    }

    if (visibleMin < fullDomain[0]) {
      transform.x = 50 - transform.k * xScale(fullDomain[0]);
    }

    updateTimeline(transform);
    // Store the current transform for the next event.
    prevTransform = { x: transform.x, y: transform.y, k: transform.k };
  })
  .on("end", (event) => {
    // Reset the pin flags after a zoom event
    pinnedRight = false;
    pinnedLeft = false;
  });

// Attach the zoom behavior to the SVG container.
svg.call(zoom);

// Perform the initial render.
updateTimeline(d3.zoomIdentity);
