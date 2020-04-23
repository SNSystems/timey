# Timing Results

## Repositories

| Repository | Commit |
| --- | --- |
| [llvm-project-prepo](http://github.com/SNSystems/llvm-project-prepo) | commit [`{{llvm_project_prepo_short}}`](https://github.com/SNSystems/llvm-project-prepo/commit/{{llvm_project_prepo_long}}) |
| [pstore](http://github.com/SNSystems/pstore) | commit [`{{pstore_short}}`](https://github.com/SNSystems/pstore/commit/{{pstore_long}}) |
| [rld](http://github.com/SNSystems/rld) | commit [`{{rld_short}}`](https://github.com/SNSystems/rld/commit{{rld_long}}) |

## Performance Profiles

### lld

![lld performance profile](./lld.svg)

[Raw data](./lld.csv)

This chart shows the link times for lld for different numbers of external and linkonce symbols.

### rld

![rld performance profile](./rld.svg)

[Raw data](./rld.csv)

This chart shows the link times for rld for different numbers of external and linkonce symbols.

## Comparisons (lld vs. rld)

### External Symbol Resolution

![lld vs. rld (external symbol resolution)](./external.svg)

[Raw data](./external.csv)

This chart shows the performance of the two linkers when presented with modules containing a (fixed) large number of linkonce symbols and variable number of external symbols.

### Linkonce Symbol Resolution

![lld vs. rld (linkonce symbol resolution)](./linkonce.svg)

[Raw data](./linkonce.csv)

This chart shows the performance of the two linkers when presented with modules containing a (fixed) large number of external symbols and variable number of linkonce symbols.
