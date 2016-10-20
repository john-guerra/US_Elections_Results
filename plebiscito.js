var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    margin = { top: 50, bottom:20, right: 20, left: 20},
    centered,
    fmt = d3.format(" >5.2%");


function ready(error, mapData, data) {
  if (error) throw error;


  var dictCities = {};
  data.forEach(function (d) {
    //Parse the percentages
    d["% No"] = +(d["% No"].slice(0,-1).replace(",", "."))/100;
    d["% Si"] = +(d["% Si"].slice(0,-1).replace(",", "."))/100;
    d.result = d["% Si"] - d["% No"];
    var res = {};
    dictCities[d.Municipio.toUpperCase()]=d;
  });

  var color = d3.scaleSequential(d3.interpolateRdBu)
    .domain([-1, 1]);

  var land = topojson.feature(mapData, {
    type: "GeometryCollection",
    geometries: mapData.objects.mpios.geometries.filter(function(d) {
      return (d.id / 10000 | 0) % 100 !== 99;
    })
  });
  var landState = topojson.feature(mapData, {
    type: "GeometryCollection",
    geometries: mapData.objects.depts.geometries.filter(function(d) {
      return (d.id / 10000 | 0) % 100 !== 99;
    })
  });

  // Add background
  svg.append('rect')
    .attr('class', 'background')
    .attr('width', width)
    .attr('height', height)
    .on('click', clicked);
  // To allow the zoom back
  // svg.on('click', clicked);
  var g = svg.append("g");


  // EPSG:32111
  var path = d3.geoPath()
      .projection(d3.geoTransverseMercator()
          .rotate([74 + 30 / 60, -38 - 50 / 60])
          .fitExtent([[margin.left, margin.top], [width-margin.right, height-margin.bottom]], land));
  var pathState = d3.geoPath()
      .projection(d3.geoTransverseMercator()
          .rotate([74 + 30 / 60, -38 - 50 / 60])
          .fitExtent([[margin.left, margin.top], [width-margin.right, height-margin.bottom]], landState));

  g.selectAll("path")
    .data(land.features)
    .enter().append("path")
      .attr("class", "tract")
      .on('click', clicked)
      .on('mouseover', updateDetails)
      .style("fill", function (d) {
        var city = dictCities[d.properties.name];
        if (city)
          return color(city.result);
        else {
          console.log(d.properties.name + "," + d.properties.dpt);
          return color(0);
        }
      })
      .attr("d", path)
    .append("title")
      .text(function(d) {
        var city = dictCities[d.properties.name];
        var msg = d.properties.name + ", " + d.properties.dpt;
        if (city)
          msg += " %Si - %No: " + fmt(city.result);
        return msg;
      });
  g.append("path")
      .datum(topojson.mesh(mapData, mapData.objects.mpios, function(a, b) { return a !== b; }))
      .attr("class", "tract-border")

      .attr("d", path);

  g.append("path")
      .datum(topojson.mesh(mapData, mapData.objects.depts, function(a, b) { return a !== b; }))
      .attr("class", "tract-border-state")
      .attr("d", pathState);

  // The details
  var wScale = d3.scaleLinear()
    .domain([-1, 1])
    .range([-200, 200]);
  var details_layer = svg.append("g")
    .attr("id", "details")
    .attr("transform", "translate(" + (width/2-100) + ", 30)");
  details_layer.append("rect")
    .attr("class", "background")
    .attr("transform", "translate(-150, -20)")
    .attr("width", 500)
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("height", 60);
  details_layer.append("text")
    .attr("id", "cityLegend")
    .text("Colombia")
    .attr("transform", "translate(100, 0)");

  var detailsBars = details_layer.selectAll("bar")
    .data([0.4978, -0.5021])
    .enter()
    .append("g")
    .attr("class", "bar");
  detailsBars
    .append("rect")
    .attr("width", 0)
    .attr("height", 20)
    .attr("x", 100)
    .attr("y", 10)
    .style("fill", color)
    .transition()
    .duration(500)
      .attr("x", function (d) { return d>0 ? 100 : 100 - wScale(-d); })
      .attr("width", function (d) { return d>0 ? wScale(d) : wScale(-d); });
  detailsBars.append("text")
    .text(function(d) { return fmt(d>0?d:-d)})
    .attr("dx", function (d) { return d>0 ? 5 : -5; })
    .attr("dy", 24)
    .attr("x", 100)
    .style("text-anchor", function (d) { return d>0 ? "start": "end";})
    .transition()
    .duration(500)
      .attr("x", function (d) { return d>0 ? 100 + wScale(d) : 100 - wScale(-d); })



  // The legend
  svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(760,20)");

  var legendLinear = d3.legendColor()
    // .shapeWidth(30)
    .cells(7)
    .orient('vertical')
    .title('Diferencia')
    .labels([
    " 100.00% por el Si",
    "  66.67%",
    "  33.33%",
    "   0.00%",
    " -33.33%",
    " -66.67%",
    "-100.00% por el No",
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
      var centroid = path.centroid(d);
      x = centroid[0];
      y = centroid[1];
      k = 6;
      centered = d;
    } else {
      x = width / 2;
      y = height / 2;
      k = 1;
      centered = null;
    }

    // // Highlight the clicked province
    // svg.selectAll('path')
    //   .style('fill', function(d){return centered && d===centered ? '#D5708B' : fillFn(d);});

    // Zoom
    g.transition()
      .duration(750)
      .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')scale(' + k + ')translate(' + -x + ',' + -y + ')');
  }

  function updateDetails(d) {

    var data = [0.4978, -0.5021],
        name = "Colombia diferencia " + fmt(data[0] + data[1]),
        city;

    if (d) {
      city = dictCities[d.properties.name];
      if (city) {
        data =  [city["% Si"], -city["% No"]];
        name = d.properties.name + " diferencia: " + fmt(data[0] + data[1]);
      }
    }
    console.log(data);
    console.log(name);
    var detailsBars = details_layer
      .selectAll(".bar")
      .data(data);

    detailsBars.select("rect")
      .transition()
      .duration(500)
      .attr("x", function (d) { return d>0 ? 100 : 100 - wScale(-d); })
      .attr("width", function (d) { return d>0 ? wScale(d) : wScale(-d); })
      .style("fill", color);

    detailsBars.select("text")
      .text(function(d) { return fmt(d>0?d:-d)})
      .transition()
      .duration(500)
        .attr("x", function (d) { return d>0 ? 100 + wScale(d) : 100 - wScale(-d); })


    details_layer.select("#cityLegend").text(name);

  }
}



d3.queue()
  .defer(d3.json, "colombia-municipios.json" )
  .defer(d3.csv, "plebiscito_Colombia_2016.csv" )
  .await(ready);
