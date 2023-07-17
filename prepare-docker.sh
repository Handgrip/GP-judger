HCDIR=$(dirname $(readlink -f "$0"))

# https://www.centos.org/centos-linux-eol/
sed -i 's/mirrorlist/#mirrorlist/g' /etc/yum.repos.d/CentOS-*
sed -i 's|#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g' /etc/yum.repos.d/CentOS-*

dnf update --assumeyes

curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -

pkgs="autoconf \
bison \
flex \
gcc \
gcc-c++ \
libstdc++ \
libstdc++-static \
glibc-static \
libtool \
make \
pkg-config \
protobuf-devel \
protobuf-compiler \
java-1.8.0-openjdk \
java-1.8.0-openjdk-devel \
python3 \
libnl3-devel \
nodejs"

dnf install --enablerepo=PowerTools --assumeyes $pkgs || dnf install --enablerepo=powertools --assumeyes $pkgs

mkdir /usr/local/lib/GP/nlohmann -p && curl 'https://github.com/nlohmann/json/releases/latest/download/json.hpp' -L -o /usr/local/lib/GP/nlohmann/json.hpp

python3 -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple --upgrade pip
python3 -m pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
python3 -m pip install --no-cache-dir numpy scipy

dnf clean all
rm -rf /var/cache/yum
rm -rf /var/cache/dnf
