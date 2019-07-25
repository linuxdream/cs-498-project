(async () => {
  // Load data
  let data = await d3.csv("https://raw.githubusercontent.com/washingtonpost/data-police-shootings/master/fatal-police-shootings-data.csv");
  const raceColors = {
    'A': 'green',
    'B': 'black',
    'W': 'orange',
    'H': 'red',
    'O': 'grey',
    'U': 'blue'
  };

  const annotations = {
    'W': [{
      note: {
        label: 'White victims over time.',
        title: 'Decreasing',
        wrap: 150
      },
      x: 123,
      y: 53,
      dx: 40,
      dy: 50
    }],
    'U': [{
      note: {
        label: 'Unknown race over time.',
        title: 'Increasing',
        wrap: 200
      },
      x: 123,
      y: 337,
      dx: 40,
      dy: -25
    }]
  };

  // Apply watchers
  d3.selectAll('input[name=race]').on('change', updateAll);
  d3.selectAll('#armed').on('change', updateAll);
  d3.selectAll('#gender').on('change', updateAll);

  /**
   * This section is for the byStateGraph!
   */
  const byStateSvg = d3.select('#byStateGraph');

  function updateByState() {
    let dataByState = {};
    let height = 900;
    const width = 900;
    let x = null;
    let y = null;
    const margin = {
      top: 30,
      right: 0,
      bottom: 10,
      left: 30
    };

    function xAxis(g) {
      g.attr("transform", `translate(0,${margin.top})`)
        .call(d3.axisTop(x).ticks(width / 80))
        .call(g => g.select(".domain").remove())
    }

    function yAxis(g) {
      g.attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickSizeOuter(0))
    }

    byStateSvg.selectAll('*').remove();

    // Do the state groupings
    dataByState = data.reduce((p, c) => {
      let state = c.state;

      // Apply filters
      let add = shouldCount(c)

      if (add) {
        // Init for state
        if (!p.hasOwnProperty(state)) {
          p[state] = 0;
        }

        p[state]++;
      }

      return p;
    }, {});

    dataByState = Object.keys(dataByState).map((k) => {
      return {
        name: k,
        value: dataByState[k]
      }
    }).sort((a, b) => {
      return b.value - a.value;
    });

    x = d3.scaleLinear()
      .domain([0, d3.max(dataByState, d => d.value)])
      .range([margin.left, width - margin.right]);

    y = d3.scaleBand()
      .domain(dataByState.map(d => d.name))
      .range([margin.top, height - margin.bottom])
      .padding(0.1);

    format = x.tickFormat(20);

    byStateSvg.append("g")
      .attr("fill", "steelblue")
      .selectAll("rect")
      .data(dataByState)
      .join("rect")
      .transition().duration(2000)
      .attr("x", x(0))
      .attr("y", d => y(d.name))
      .attr("width", d => x(d.value) - x(0))
      .attr("height", y.bandwidth());

    byStateSvg.append("g")
      .attr("fill", "white")
      .attr("text-anchor", "end")
      .style("font", "12px sans-serif")
      .selectAll("text")
      .data(dataByState)
      .join("text")
      .attr("x", d => x(d.value) - 4)
      .attr("y", d => y(d.name) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .text(d => format(d.value));

    // Put it all together
    byStateSvg.append("g")
      .call(xAxis);

    byStateSvg.append("g")
      .call(yAxis);
  }


  /**
   * This section is for the byRaceGraph
   */
  const byRaceSvg = d3.select('#byRaceGraph');

  function updateByRace() {
    let dataByRace = {};
    let height = 400;
    const width = 400;
    let maxY = 0;
    const margin = {
      top: 30,
      right: 0,
      bottom: 20,
      left: 30
    };
    let bisectDate = d3.bisector(function (d) {
      return d.year;
    }).left;

    function xAxis(g) {
      g.attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(width / 80).tickSizeOuter(0));
    }

    function yAxis(g) {
      g.attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickSizeOuter(0))
    }

    byRaceSvg.selectAll('*').remove();

    // Do the race groupings
    dataByRace = data.reduce((p, c) => {
      let race = c.race;
      let year = new Date(c.date).getFullYear();

      if (!race) {
        race = 'U';
      }

      // Apply filters
      let add = shouldCount(c)

      if (add) {
        // Init for race counts
        if (!p.hasOwnProperty(race)) {
          p[race] = {};
        }

        if (!p[race].hasOwnProperty(year)) {
          p[race][year] = 0;
        }


        p[race][year]++;
      }

      return p;
    }, {});

    // Get the highest year number for the max y domain
    for (let race in dataByRace) {
      for (let year in dataByRace[race]) {
        if (dataByRace[race][year] > maxY) {
          maxY = dataByRace[race][year];
        }
      }
    }

    let x = d3.scaleLinear()
      .domain([2015, 2019])
      .range([margin.left, width - margin.right]);

    let y = d3.scaleLinear()
      .domain([maxY, 0])
      .range([margin.top, height - margin.bottom]);

    // Put it all together
    byRaceSvg.append('g')
      .call(xAxis);

    byRaceSvg.append('g')
      .call(yAxis);

    // Add each race line
    for (let race in dataByRace) {
      const localData = Object.keys(dataByRace[race]).map((year) => {
        if (!dataByRace[race][year]) {
          return false;
        }

        return {
          year: parseInt(year),
          value: dataByRace[race][year]
        }
      });

      byRaceSvg.append('path')
        .datum(localData)
        .attr('fill', 'none')
        .attr('stroke', raceColors[race])
        .attr('stoke-width', 2)
        .attr('d', d3.line()
          .x((d) => {
            return x(d.year);
          })
          .y((d) => {
            return y(d.value)
          })
        );

      // Add annotations
      if (annotations.hasOwnProperty(race)) {
        const makeAnnotations = d3.annotation().annotations(annotations[race]);
        byRaceSvg.append('g').call(makeAnnotations)
      }
    }
  }

  /**
   * This section is for the byArmedGraph 
   */
  const byArmedSvg = d3.select('#byArmedGraph');

  function updateByArmed() {
    let height = 600;
    const width = 900;

    byArmedSvg.selectAll('*').remove();

    const byArmedData = data.reduce((t, d) => {
      let add = shouldCount(d);

      if (add) {
        if (!d.armed || d.armed === 'undetermined') {
          d.armed = 'unknown';
        }

        if (d.armed == 'unknown weapon') {
          d.armed = 'unknown';
        }

        if (!t.hasOwnProperty(d.armed)) {
          t[d.armed] = 0;
        }

        t[d.armed]++;
        return t;
      } else {
        return t;
      }
    }, {});

    // Convert object into array
    let byArmedDataArray = [];

    Object.keys(byArmedData).forEach((a) => {
      let d = {
        parent: 'Weapon',
        armed: a,
        value: byArmedData[a]
      }

      byArmedDataArray.push(d);
    });

    // Sort
    byArmedDataArray.sort((a, b) => {
      return b.value - a.value;
    });

    // Slice it..too many to display
    byArmedDataArray = byArmedDataArray.slice(0, 10);

    // Add the parent element
    byArmedDataArray.push({
      armed: 'Weapon'
    });

    let root = d3.stratify()
      .id(function (d) {
        return d.armed;
      })
      .parentId(function (d) {
        return d.parent;
      })
      (byArmedDataArray);

    root.sum(function (d) {
      return +d.value
    });

    d3.treemap()
      .size([width, height])
      .padding(4)
      (root);

    byArmedSvg
      .selectAll('rect')
      .data(root.leaves())
      .enter()
      .append('rect')
      .attr('x', function (d) {
        return d.x0;
      })
      .attr('y', function (d) {
        return d.y0;
      })
      .attr('width', function (d) {
        return d.x1 - d.x0;
      })
      .attr('height', function (d) {
        return d.y1 - d.y0;
      })
      .style("stroke", "black")
      .style("fill", "#69b3a2");

    byArmedSvg
      .selectAll("text")
      .data(root.leaves())
      .enter()
      .append("text")
      .attr("x", function (d) {
        return d.x0 + 10
      })
      .attr("y", function (d) {
        return d.y0 + 20
      })
      .text(function (d) {
        return `${d.data.armed} (${d.data.value})`
      })
      .attr("font-size", "12px")
      .attr("fill", "black")
  }

  /**
   * Determines if the current data record should be
   included in the graph. 
   *
   * @param {object} c 
   */
  function shouldCount(c) {
    // Race
    const checkedRace = d3.selectAll('.race-checkboxes input:checked')
    let raceValues = [];

    checkedRace.each(function () {
      raceValues.push(this.value);
    });

    // Apply race filter
    if (raceValues.length) {
      // Count unknown as Other
      if (!c.race) {
        c.race = 'O';
      }

      if (raceValues.indexOf(c.race) == -1) {
        return false;
      }
    }

    // Armed
    const armed = d3.select('#armed').node().value;

    if (armed) {
      switch (armed) {
        case 'y':
          if (c.armed === 'unarmed') {
            return false;
          }
          break;
        case 'n':
          if (c.armed !== 'unarmed' && c.armed !== 'unknown Weapon') {
            return false;
          }
          break;
        case 'u':
          if (c.armed !== 'unknown' && c.armed) {
            return false;
          }
          break;
      }
    }

    // Gender
    const gender = d3.select('#gender').node().value;

    if (gender) {
      switch (gender) {
        case 'M':
          if (c.gender && c.gender !== 'M') {
            return false;
          }
          break;
        case 'F':
          if (c.gender && c.gender !== 'F') {
            return false;
          }
          break;
        case 'U':
          if (c.gender) {
            return false;
          }
          break;
      }
    }

    return true;
  }

  function updateAll() {
    updateByRace();
    updateByState();
    updateByArmed();
  }

  // Update all for initial load
  updateAll();
})();