# timey

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/1464302e08074a408e8e17ad66f11cc4)](https://app.codacy.com/manual/paulhuggett/timey?utm_source=github.com&utm_medium=referral&utm_content=paulhuggett/timey&utm_campaign=Badge_Grade_Dashboard)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=paulhuggett_timey&metric=alert_status)](https://sonarcloud.io/dashboard?id=paulhuggett_timey)
[![Total alerts](https://img.shields.io/lgtm/alerts/g/paulhuggett/timey.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/paulhuggett/timey/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/paulhuggett/timey.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/paulhuggett/timey/context:javascript)

A utility for timing linkers.


## Performance Profiles

### lld

![lld performance profile](./results/lld.svg)

### rld

![rld performance profile](./results/rld.svg)

## Comparisons (lld vs. rld)

### External symbol resolution

![lld vs. rld (external symbol resolution)](./results/compare_external.svg)

### Linkonce symbol resolution

![lld vs. rld (linkonce symbol resolution)](./results/compare_linkonce.svg)
