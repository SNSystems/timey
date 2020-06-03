# Timing Results

## Repositories

| Repository | Commit |
| --- | --- |
| [llvm-project-prepo](http://github.com/SNSystems/llvm-project-prepo) | commit [`37f13`](https://github.com/SNSystems/llvm-project-prepo/commit/37f13020748441a795bf6f0a383f7e8de5447dc9) |
| [pstore](http://github.com/SNSystems/pstore) | commit [`d72f1`](https://github.com/SNSystems/pstore/commit/d72f14689f5615f7ee5fbd369ee639ba02548a6e) |
| [rld](http://github.com/SNSystems/rld) | commit [`56eae`](https://github.com/SNSystems/rld/commit/56eaee5c1203d62d38e12caede048fb3dfe85180) |

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
