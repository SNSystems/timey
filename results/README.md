# Timing Results

## Repositories

| Repository | Commit |
| --- | --- |
| [llvm-project-prepo](http://github.com/SNSystems/llvm-project-prepo) | commit [`8fd3f`](https://github.com/SNSystems/llvm-project-prepo/commit/8fd3f1d9f7ca74754751a343544385cfe96a7781) |
| [pstore](http://github.com/SNSystems/pstore) | commit [`46b67`](https://github.com/SNSystems/pstore/commit/46b67c3ed01cf1ec3e5469357c638861ac428560) |
| [rld](http://github.com/SNSystems/rld) | commit [`a645b`](https://github.com/SNSystems/rld/commita645b442dd8fb053ec91b1ed5e4a973fd39b0f28) |

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
