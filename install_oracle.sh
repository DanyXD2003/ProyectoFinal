#!/bin/bash

# Descargar Instant Client
wget https://download.oracle.com/otn_software/mac/instantclient/198000/instantclient-basic-macos.arm64-19.8.0.0.0dbru.zip

# Descomprimir
unzip instantclient-basic-macos.arm64-19.8.0.0.0dbru.zip -d wallet/

# Limpiar
rm instantclient-basic-macos.arm64-19.8.0.0.0dbru.zip