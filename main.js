var svg = d3.select("svg"),
    width = $(document).width() * 10 / 12,
    height = $(document).height() - 200,
    margin = {
        top: 20,
        bottom: width > 767 ? 20 : 100,
        right: 20,
        left: 0
    },
    centered,
    comma_fmt = d3.format(",.0f"),
    fmt = d3.format(" >5.2%"),
    errorCount = 0;

svg.attr("width", width)
    .attr("height", height);

// tooptip
var tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden").attr("class", "tooltip");

function ready(error, us, data) {
    if (error) throw error;


    var dictCities = {};
    data.forEach(function(d) {
        //Parse the percentages
        d["per_gop"] = +(d["per_gop"].slice(0, -1).replace(",", "."));
        d["per_dem"] = +(d["per_dem"].slice(0, -1).replace(",", "."));
        d.result = d["per_dem"] - d["per_gop"];
        d.gop_votes = +d.votes_gop;
        d.dem_votes = +d.votes_dem;
        d.votes_total = +d.total_votes;
        d.combined_fips = +d.combined_fips;
        dictCities[d.combined_fips] = d;
    });

    var color = d3.scaleSequential(d3.interpolateRdBu)
        .domain([-1, 1]);

    // Add background
    svg.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height)
        // .on("click", clicked);
        // To allow the zoom back
        // svg.on("click", clicked);
    var zoom = d3.zoom()
        .scaleExtent([1, 15])
        .on("zoom", zoomed);

    svg.style("pointer-events", "all")
        .call(zoom);
    var g = svg.append("g");

    function zoomed() {
        console.log(d3.event.transform);
        g.attr("transform", d3.event.transform);
    };

    var projection = d3.geoAlbersUsa()
        .scale(width)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    g.selectAll("path")
        .data(topojson.feature(us, us.objects.counties).features)
        .enter().append("path")
        .attr("class", "tract")
        .on("click", clicked)
        .on("mouseover", updateDetails).on("mouseout",hideDetails)
        .style("fill", function(d) {
            var city = dictCities[d.id];
            if (city)
                return color(city.result);
            else {
                errorCount++;
                console.log(d.id + " Not found" + " errors = " + errorCount);
                return color(0);
            }
        })
        .attr("d", path)
        .append("title")
        .text(function(d) {
            var city = dictCities[d.id],
                county,
                state;

            // var msg = d.id;
            if (city) {
                county = city.county_name;
                state = city.state_abbr;
                var msg = county + ', ' + state + " Difference: " + fmt(city.result);
            }
            return msg;
        });


    // g.append("g")
    //     .attr("class", "counties")
    //   .selectAll("path")
    //     .data(topojson.feature(us, us.objects.counties).features)
    //   .enter().append("path")
    //     .attr("class", "tract-border")
    //     .attr("d", path);

    g.append("path")
        .datum(topojson.mesh(us, us.objects.states, function(a, b) {
            return a !== b;
        }))
        .attr("class", "tract-border-state")
        .attr("d", path);


    // g.append("path")
    //     .datum(topojson.mesh(mapData, mapData.objects.depts, function(a, b) { return a !== b; }))
    //     .attr("class", "tract-border-state")
    //     .attr("d", pathState);

    // The details
    var wScale = d3.scaleLinear()
        .domain([-1, 1])
        .range([-width / 3, width / 3]);
    var details_layer = svg.append("g")
        .attr("id", "details")
        .attr("transform", "translate(" + (width / 2 - 100) + ", 30)");
    details_layer.append("rect")
        .attr("class", "background")
        .attr("transform", "translate(" + (-wScale.range()[1] + 100) + ", -20)")
        .attr("width", wScale.range()[1] * 2 + 70)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("height", 60);
    details_layer.append("text")
        .attr("id", "cityLegend")
        .text("Difference")
        .attr("transform", "translate(100, 0)");

    var detailsBars = details_layer.selectAll("bar")
        .data([0.4978, -0.5021])
        .enter()
        .append("g")
        .attr("class", "bar");
    detailsBars
        .append("rect")
        .attr("width", 0)
        .attr("height", width > 767 ? 20 : 10)
        .attr("x", 100)
        .attr("y", 10)
        .style("fill", color)
        .transition()
        .duration(500)
        .attr("x", function(d) {
            return d > 0 ? 100 : 100 - wScale(-d);
        })
        .attr("width", function(d) {
            return d > 0 ? wScale(d) : wScale(-d);
        });
    detailsBars.append("text")
        .text(function(d) {
            return (d > 0 ? "" : "Rep ") +
                fmt(d > 0 ? d : -d) +
                (d > 0 ? " Dem" : "");
        })
        .attr("dx", function(d) {
            return d > 0 ? 5 : -5;
        })
        .attr("dy", 24)
        .attr("x", 100)
        .style("text-anchor", function(d) {
            return d > 0 ? "start" : "end";
        })
        .transition()
        .duration(500)
        .attr("x", function(d) {
            return d > 0 ? 100 + wScale(d) : 100 - wScale(-d);
        });



    // The legend
    svg.append("g")
        .attr("class", "legend")
        .attr("transform",
            width > 767 ?
            "translate(" + (width - margin.right - 150) + ",100)" :
            "translate(" + (width / 2 - 100) + "," + (height - 120) + ")"
        );

    var legendLinear = d3.legendColor()
        // .shapeWidth(30)
        .cells(7)
        .orient(width > 767 ? "vertical" : "horizontal")
        .title("Difference")
        .labels([
            " 100.00% Dem",
            "  66.67%",
            "  33.33%",
            "   0.00%",
            "  33.33%",
            "  66.67%",
            " 100.00% Rep",
        ].reverse())
        .labelFormat(fmt)
        .ascending(true)
        .labelAlign("end")
        .scale(color);

    svg.select(".legend")
        .call(legendLinear);

    // When clicked, zoom in
    function clicked(d) {
        updateDetails(d);
        var x, y, k;

        // Compute centroid of the selected path
        if (d && centered !== d) {
            // if (d) {
            var centroid = path.centroid(d);
            x = centroid[0];
            y = centroid[1];
            // k = zoom.scaleExtent()[1];
            k = 10;
            centered = d;
        }
        else {
            x = width / 2;
            y = height / 2;
            k = 1;
            centered = null;
        }



        // Manually Zoom
        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(k)
                .translate(-x, -y));
    }

    function updateDetails(d) {

        var data = [0.4978, -0.5021],
            votes_total,
            gop_votes,
            dem_votes,
            name = "Difference " + fmt(data[0] + data[1]),
            state,
            county,
            city;

        if (d) {
            city = dictCities[d.id];
            if (city) {
                votes_total = city.votes_total,
                gop_votes = city.gop_votes,
                dem_votes = city.dem_votes,
                county = city['county_name'];
                state = city['state_abbr'];
                data = [city["per_dem"], -city["per_gop"]];
                name = county + ', ' + state + " Difference: " + fmt(data[0] + data[1]);
            }
        }
        // console.log(data);
        // console.log(name);
        var detailsBars = details_layer
            .selectAll(".bar")
            .data(data);

        detailsBars.select("rect")
            .transition()
            .duration(500)
            .attr("x", function(d) {
                return d > 0 ? 100 : 100 - wScale(-d);
            })
            .attr("width", function(d) {
                return d > 0 ? wScale(d) : wScale(-d);
            })
            .style("fill", color);

        detailsBars.select("text")
            .text(function(d) {
                return (d > 0 ? "" : "Rep ") +
                    fmt(d > 0 ? d : -d) +
                    (d > 0 ? " Dem" : "")
            })
            .transition()
            .duration(500)
            .attr("x", function(d) {
                return d > 0 ? 100 + wScale(d) : 100 - wScale(-d);
            })


        details_layer.select("#cityLegend").text(name);

        if (state == 'AK') {
            var report_level = "<b>[Alaska State-level Results Reported]</b><br/>";
        } else {
            report_level = "<b>County, State: </b>" + county + ', ' + state + "<br/>";
        }

        // show tooltip with information from the __data__ property of the element
        var content = report_level +
            "<b>Hillary Clinton: </b>" + comma_fmt(dem_votes) + "<br/>" +
            "<b>Donald J. Trump: </b>" + comma_fmt(gop_votes) + "<br/>" +
            "<b>Total Votes Cast: </b>" + comma_fmt(votes_total) + "<br/>";

        // In d3.v4, style and attribute properties must be set individually
        tooltip.html(content);
        tooltip.style("visibility", "visible");
        tooltip.style("top", (event.pageY + 30) + "px");
        tooltip.style("left", (event.pageX + 30) + "px");

        return tooltip;

    }
}

// Hide tooltip on hover
function hideDetails() {

    // hide tooltip
    return tooltip.style("visibility", "hidden");
}


d3.queue()
    .defer(d3.json, "us.json")
    .defer(d3.csv, "2016_US_County_Level_Presidential_Results.csv")
    .await(ready);
