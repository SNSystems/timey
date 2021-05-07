# Timing Results

## Repositories

| Repository | Commit |
| --- | --- |
| [llvm-project-prepo](http://github.com/SNSystems/llvm-project-prepo) | commit [`b677e9f8528a`](https://github.com/SNSystems/llvm-project-prepo/commit/b677e9f8528a6fa667632e0f5576349b1b5eb83a) |
| [pstore](http://github.com/SNSystems/pstore) | commit [`16172f11`](https://github.com/SNSystems/pstore/commit/16172f11a528e446e34e7282ed5b457e7bcd48ef) |

## Comparisons (lld vs. rld)

The following charts show the results of running the two linker with varying, amounts of gest input. These inputs are created by the rld-gen tool (for linkers other than rld, repo2obj is then used to convert this data and produce object files for the test).

They are not intended in any way to mimic “real world” usage but are instead more akin to compiler benchmarks in that each test is intended to exercise and measure isolated features of the tool.

Each data point of each chart shows the result of performing 50 links. The center point of the line shows the mean time for of all of the runs. The error bars show the 95% confidence interval. The “best fit” line is computed from the least squares of the mean values.

### Test Parameter Notation

Tests all follow the same pattern: we run rld-gen, followed by the requested linker(s). Before running a linker other than rld, we convert the rld-gen output to object files using repo2obj.

The test parameters follow an expanded version of the rld-gen command-line syntax. The number of each type of objects to be generated is listed. To generate the range of inputs required for these tests one or more of these arguments can include a range of values. These are specified as min,max,step (in a similar fashion to [Fortran do loops](https://fortran-lang.org/learn/quickstart/operators_control_flow#loop-constructs-do)). 

For example, consider a test parameter such as:

`--modules 10 --common 0 --linkonce 0 --external 0,1000,100`

This will produce 11 data points with the ‘external’ value sweeping from 0 to 1000 in steps of 100.

### Results

#### External Symbol Resolution

![lld vs. rld (external symbol resolution)](./external.svg)

This chart shows the performance of the two linkers when presented with 100 modules containing a variable number of external symbols.

Test parameters: `--common 0 --external 0,50000,1000 --linkonce 0 --modules 100 --section-size 16`<br>
Raw data: [rld](./external.rld.csv) [ld.lld](./external.ld.lld.csv)

#### Linkonce Symbol Resolution

![lld vs. rld (linkonce symbol resolution)](./linkonce.svg)

This chart shows the performance of the two linkers when presented with 100 modules containing a variable number of linkonce symbols.

Test parameters: `--common 0 --external 0 --linkonce 0,50000,1000 --modules 100 --section-size 16`<br>
Raw data: [rld](./linkonce.rld.csv) [ld.lld](./linkonce.ld.lld.csv)

#### Common Symbol Resolution

![lld vs. rld (common symbol resolution)](./common.svg)

This chart shows the performance of the two linkers when presented with 100 modules containing a variable number of common symbols.

Test parameters: `--common 0,50000,1000 --external 0 --linkonce 0 --modules 100 --section-size 16`<br>
Raw data: [rld](./common.rld.csv) [ld.lld](./common.ld.lld.csv)

#### Per-module Overhead

![lld vs. rld (per-module overhead)](./modules.svg)

This chart shows the per-module overhead for each linker. For each data point, the number of input modules is increased but those modules are all empty.

Test parameters: `--common 0 --external 0 --linkonce 0 --modules 1,5000,100 --section-size 16`<br>
Raw data: [rld](./modules.rld.csv) [ld.lld](./modules.ld.lld.csv)

#### Section size

![lld vs. rld (effect of section size)](./section-size.svg)

This chart shows effect of changing the amount of data carried in each section. A test of raw copying performance.

Test parameters: `--common 1000 --external 1000 --linkonce 1000 --modules 10 --section-size 0,32768,4096`<br>
Raw data: [rld](./section-size.rld.csv) [ld.lld](./section-size.ld.lld.csv)

