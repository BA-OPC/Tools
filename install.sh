#!/bin/bash
#  DEPS from package manager
#  make cmkae gcc g++ python3 git doxygen graphviz libssl-dev

# mbedtls
git clone https://github.com/Mbed-TLS/mbedtls.git mbedtls && \ 
cd mbedtls && git checkout mbedtls-2.28 && mkdir build && \
cd build && cmake .. && make && sudo make install && cd ../..

# check
git clone https://github.com/libcheck/check.git check
cd check && git checkout 0076ec62f71d33b5b54530f8471b4c99f50638d7 
mkdir build && cd build
cmake .. && make && sudo make install && cd ../..

# expat
git clone https://github.com/libexpat/libexpat.git libexpat
cd libexpat/expat && mkdir build && cd build && cmake .. && make 
sudo make install && cd ../../.. 

# paho
git clone https://github.com/eclipse/paho.mqtt.c.git paho
cd paho
mkdir build && cd build && cmake .. && make && sudo make install
cd ../..


# S2OPC
git clone https://gitlab.com/systerel/S2OPC && \
cd S2OPC && ./build.sh

# clean up
cd ..
rm -rf check mbedtls libexpat paho
