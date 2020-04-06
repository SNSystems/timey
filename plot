set terminal svg
#set output 'output.svg'

set dgrid3d 30,30
set hidden3d
set xlabel "External Symbols"
set ylabel "Linkonce Symbols"
set zlabel "Time(ms)" #offset 1, 0
set view 120, 50

splot './results/output.dat' using "external":"linkonce":"time" with lines
