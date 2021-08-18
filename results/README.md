# Timing Results

## Repositories

| Repository | Commit |
| --- | --- |
| [llvm-project-prepo](http://github.com/SNSystems/llvm-project-prepo) | commit [`ef5d70751398`](https://github.com/SNSystems/llvm-project-prepo/commit/ef5d707513989e377ae589b15599e33e4e327b5c) |
| [pstore](http://github.com/SNSystems/pstore) | commit [`193317a5`](https://github.com/SNSystems/pstore/commit/193317a5d0d00f56d89670692d4332a2fa819ce3) |

## Host

The host machine used for these timings: darwin, 20.5.0, x64, 16 × Intel(R) Xeon(R) W-2140B CPU @ 3.20GHz, 64 GiB RAM

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

Test parameters: `--common 0 --external 0,50000,1000 --linkonce 0 --modules 100 --section-size 16 --prefix-length 1 --external-fixups 0 --internal-fixups 0`<br>
Raw data: [rld](./external.rld.csv) [ld.lld](./external.ld.lld.csv)

#### Linkonce Symbol Resolution

![lld vs. rld (linkonce symbol resolution)](./linkonce.svg)

This chart shows the performance of the two linkers when presented with 100 modules containing a variable number of linkonce symbols.

Test parameters: `--common 0 --external 0 --linkonce 0,50000,1000 --modules 100 --section-size 16 --prefix-length 1 --external-fixups 0 --internal-fixups 0`<br>
Raw data: [rld](./linkonce.rld.csv) [ld.lld](./linkonce.ld.lld.csv)

#### Common Symbol Resolution

![lld vs. rld (common symbol resolution)](./common.svg)

This chart shows the performance of the two linkers when presented with 100 modules containing a variable number of common symbols.

Test parameters: `--common 0,50000,1000 --external 0 --linkonce 0 --modules 100 --section-size 16 --prefix-length 1 --external-fixups 0 --internal-fixups 0`<br>
Raw data: [rld](./common.rld.csv) [ld.lld](./common.ld.lld.csv)

#### Per-module Overhead

![lld vs. rld (per-module overhead)](./modules.svg)

This chart shows the per-module overhead for each linker. For each data point, the number of input modules is increased but those modules are all empty.

Test parameters: `--common 0 --external 0 --linkonce 0 --modules 1,5000,100 --section-size 16 --prefix-length 1 --external-fixups 0 --internal-fixups 0`<br>
Raw data: [rld](./modules.rld.csv) [ld.lld](./modules.ld.lld.csv)

#### Section Size

![lld vs. rld (effect of section size)](./section-size.svg)

This chart shows the effect of changing the amount of data carried in each section. A test of raw copying performance.

Test parameters: `--common 1000 --external 1000 --linkonce 1000 --modules 10 --section-size 0,32768,2048 --prefix-length 1 --external-fixups 0 --internal-fixups 0`<br>
Raw data: [rld](./section-size.rld.csv) [ld.lld](./section-size.ld.lld.csv)

#### Name Length

![lld vs. rld (effect of name length)](./prefix-length.svg)

This chart shows how link time is effected by the length of the strings being processed by the linker. For these runs, the contents of the input files is constant: only the length of the definition names is being changed.

Test parameters: `--common 1000 --external 1000 --linkonce 1000 --modules 20 --section-size 16 --prefix-length 1,10000,2000 --external-fixups 0 --internal-fixups 0`<br>
Raw data: [rld](./prefix-length.rld.csv) [ld.lld](./prefix-length.ld.lld.csv)

#### External Fixups

![lld vs. rld (effect of external fixups)](./external-fixups.svg)

This chart shows how link time is effected by the number of external fixups are attached to a section payload. For these runs, the contents of the input files is constant: only the number of external fixups per section is being changed.

Test parameters: `--common 0 --external 100 --linkonce 0 --modules 100 --section-size 1000 --prefix-length 1 --external-fixups 0,3996,200 --internal-fixups 0`<br>
Raw data: [rld](./external-fixups.rld.csv) [ld.lld](./external-fixups.ld.lld.csv)

#### Internal Fixups

![lld vs. rld (effect of external fixups)](./internal-fixups.svg)

This chart shows how link time is effected by the number of internal fixups are attached to a section payload. For these runs, the contents of the input files is constant: only the number of internal fixups per section is being changed.

Test parameters: `--common 0 --external 100 --linkonce 0 --modules 100 --section-size 1000 --prefix-length 1 --external-fixups 0 --internal-fixups 0,3996,200`<br>
Raw data: [rld](./internal-fixups.rld.csv) [ld.lld](./internal-fixups.ld.lld.csv)
