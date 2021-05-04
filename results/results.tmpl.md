# Timing Results

## Repositories

| Repository | Commit |
| --- | --- |
| [llvm-project-prepo](http://github.com/SNSystems/llvm-project-prepo) | commit [`{{llvm_project_prepo_short}}`](https://github.com/SNSystems/llvm-project-prepo/commit/{{llvm_project_prepo_long}}) |
| [pstore](http://github.com/SNSystems/pstore) | commit [`{{pstore_short}}`](https://github.com/SNSystems/pstore/commit/{{pstore_long}}) |

## Comparisons (lld vs. rld)

The following charts show the results of running the two linker with varying, amounts of gest input. These inputs are created by the rld-gen tool (for linkers other than rld, repo2obj is then used to convert this data and produce object files for the test).

They are not intended in any way to mimic “real world” usage but are instead more akin to compiler benchmarks in that each test is intended to exercise and measure isolated features of the tool.

Each data point of each chart shows the result of performing {{runs}} links. The center point of the line shows the mean time for of all of the runs. The error bars show the 95% confidence interval. The “best fit” line is computed from the least squares of the mean values.

### External Symbol Resolution

![lld vs. rld (external symbol resolution)](./external.svg)

This chart shows the performance of the two linkers when presented with {{modules}} modules containing a variable number of external symbols.

Test parameters: `{{external_tp}}`<br>
Raw data: [rld](./external.rld.csv) [ld.lld](./external.ld.lld.csv)

### Linkonce Symbol Resolution

![lld vs. rld (linkonce symbol resolution)](./linkonce.svg)

This chart shows the performance of the two linkers when presented with {{modules}} modules containing a variable number of linkonce symbols.

Test parameters: `{{linkonce_tp}}`<br>
Raw data: [rld](./linkonce.rld.csv) [ld.lld](./linkonce.ld.lld.csv)

### Common Symbol Resolution

![lld vs. rld (common symbol resolution)](./common.svg)

This chart shows the performance of the two linkers when presented with {{modules}} modules containing a variable number of common symbols.

Test parameters: `{{common_tp}}`<br>
Raw data: [rld](./common.rld.csv) [ld.lld](./common.ld.lld.csv)
