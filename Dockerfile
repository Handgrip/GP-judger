FROM centos:8
WORKDIR /gp
COPY ./prepare-docker.sh .
RUN bash ./prepare-docker.sh
RUN rm ./prepare-docker.sh