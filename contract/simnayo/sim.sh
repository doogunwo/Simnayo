#!/bin/bash

#!/bin/bash

# Fabric Samples의 test-network 디렉토리 경로
network_dir="/home/dgw/fabric-samples/test-network"

# 현재 디렉토리를 Fabric Samples의 test-network 디렉토리로 변경
cd "$network_dir" || exit 1

# network down
./network.sh "down"
# network.sh 스크립트 실행
./network.sh up -ca
./network.sh createChannel
./network.sh deployCC -ccn asset -ccp ../asset-transfer-basic/chaincode-go -ccl go

