#!/bin/bash

set -e

if [ "$#" -eq 0 ]; then
    echo "Please supply the interface name"
    exit 1
fi

sudo ip addr add 192.168.137.100/24 dev $1
sudo ip route add 192.168.137.0./24 dev $1
