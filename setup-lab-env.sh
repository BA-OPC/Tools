#!/bin/bash

set -e

nmcli connection up ba-lab

if [ $? -ne 0 ]; then
    if [ "$#" -eq 0 ]; then
        echo "Please supply the interface name"
        exit 1
    fi

    nmcli connection add type ethernet ifname $1 ipv4.method shared con-name ba-lab
    nmcli connection modify ba-lab ipv4.addresses 192.168.42.1/24
    nmcli connection up ba-lab
fi


