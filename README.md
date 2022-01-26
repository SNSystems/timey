# timey

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

1.  Install the various modules on which the tools depend:

    ~~~bash
    npm install
    ~~~

1.  Modify the `./update` script, change the first argument passed to ./update-readme.js to match that of the clone of [llvm-project-prepo](https://github.com/SNSystems/llvm-project-prepo) used to build the test linkers.

1.  Ensure that the linkers are on the path.

1.  Run the update script:

    ~~~bash
    ./update
    ~~~

1.  Wait patiently. Generating and linking test data for hundreds or even thousands of binaries can take a very long time! Whilst the tool runs, you’ll see a series of progress bars:

    ~~~
    % ./update
    [----------------------------------------] 0% | ETA: 2 hours | 10/15300 | rld-gen
    ~~~

6.  Results (both SVG graphs and the raw CSV data) are available in the results directory.

## Timing Results

For timing results, please refer to [this page](./results/README.md).
