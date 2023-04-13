HCDIR=$(dirname $(readlink -f "$0"))

# https://www.centos.org/centos-linux-eol/
sed -i 's/mirrorlist/#mirrorlist/g' /etc/yum.repos.d/CentOS-*
sed -i 's|#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g' /etc/yum.repos.d/CentOS-*

dnf update --assumeyes

pkgs="autoconf \
bison \
flex \
gcc \
gcc-c++ \
libstdc++ \
libstdc++-static \
glibc-static \
git \
libtool \
make \
pkg-config \
protobuf-devel \
protobuf-compiler \
git \
wget \
java-1.8.0-openjdk \
java-1.8.0-openjdk-devel \
python3 \
libnl3-devel"

dnf install --enablerepo=PowerTools --assumeyes $pkgs || dnf install --enablerepo=powertools --assumeyes $pkgs

dnf module --assumeyes install nodejs:14

dnf clean all
rm -rf /var/cache/yum
rm -rf /var/cache/dnf