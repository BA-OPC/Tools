#!/bin/bash

if [ "$#" -eq 0 ]; then
    echo "Please supply the interface name"
    exit 1
fi

sudo ip addr add 192.168.137.1/24 dev $1
sudo ip route add 192.168.137.0/24 dev $1
sudo sysctl -w net.ipv4.ip_forward=1
sudo iptables -t nat -A POSTROUTING -o wlp1s0f0 -j MASQUERADE

