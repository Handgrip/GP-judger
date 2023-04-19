FROM centos:8
WORKDIR /GP
COPY ./prepare-docker.sh .
COPY ./Tools/json.hpp /usr/local/lib/GP/nlohmann/json.hpp
RUN bash ./prepare-docker.sh
RUN rm ./prepare-docker.sh