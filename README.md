# timey

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/1464302e08074a408e8e17ad66f11cc4)](https://app.codacy.com/manual/paulhuggett/timey?utm_source=github.com&utm_medium=referral&utm_content=paulhuggett/timey&utm_campaign=Badge_Grade_Dashboard)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=paulhuggett_timey&metric=alert_status)](https://sonarcloud.io/dashboard?id=paulhuggett_timey)
[![Total alerts](https://img.shields.io/lgtm/alerts/g/paulhuggett/timey.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/paulhuggett/timey/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/paulhuggett/timey.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/paulhuggett/timey/context:javascript)

A utility for timing linkers.

## Table of Contents

-   [Usage](#usage)
-   [Timing Results](#timing-results)

## Usage

1.  Install [Node.js](https://nodejs.org/) and [GnuPlot](http://www.gnuplot.info):

    -   macOS (Using [HomeBrew](https://brew.sh/))

        ~~~bash
        brew install node gnuplot
        ~~~

    -   Linux

        ~~~bash
        sudo apt-get install nodejs gnuplot
        ~~~

2.  Install the NodeJS various modules on which the tools depend:

    ~~~bash
    npm install
    ~~~

3.  Modify the `./update` script, setting the following variables:

    -   `BIN_DIR`: The locations of the executables to be timed. Normally set this inside your LLVM build directory.
    -   `WORK_DIR`: The directory to be used for the working files. This directory should exist but be empty. **WARNING:** The contents of this directory will be overwritten by the test!
    -   `EXTERNAL`: The maximum number of external symbols to be created.
    -   `LINKONCE`: The maximum number of link-once symbols to be created.
    -   `INCREMENT`: The first test generates output files with 0 external and 0 linkonce; each subsequent test increments these values by `INCREMENT` until they reach the `EXTERNAL` and `LINKONCE` setting respectively.
    -   `MODULES`: The number of modules (simulated compilations) that are created for each test.

    The total number of symbols created for each point of the performance profile graphs is m(x + y) where:

    -   m is the number given by MODULES.
    -   x is a value in the interval \[0, LINKONCE\].
    -   y is a value in the interval \[0, EXTERNAL\].
    -   The INCREMENT value determines the number of samples taken across each interval.

4.  Run the update script:

    ~~~bash
    ./update
    ~~~

5.  Wait patiently. Generating and linking test data for hundreds or even thousands of binaries can take a very long time! Whilst the tool runs, you’ll see a pair of progress bars:

    ~~~
    [+---------------------------------------] 2% | ETA: 3 hours | 51/2500 | external 2000, linkonce 1000
    [+++++++++++++++++++++++++++-------------] 67% | ETA: a few seconds | 136/202 | repo2obj
    ~~~

    The upper bar shows the overall progress whereas the lower bar shows the stages of generating each individual result.

6.  Results (both SVG graphs and the raw CSV data) are available in the results directory.

## Timing Results

For timing results, please refer to [this page](./results/README.md).