#!/bin/bash
# sudo docker run --cgroupns private --privileged -it -v $(pwd)/config.toml:/hc/config/config.toml thinkspiritlab/heng-client --net=host
# if you need to connect to host network
sudo docker run --net=host --cgroupns private --privileged -it -v $(pwd)/config.toml:/hc/config/config.toml e9b5fed0edb1