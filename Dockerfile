FROM centos:8
WORKDIR /GP
COPY ./prepare-docker.sh .
RUN bash ./prepare-docker.sh
RUN rm ./prepare-docker.sh
