#!/bin/bash

setOSandArch() {
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(arch)
}

makeParentFolder() {
    mkdir plex
    cd plex
}

makeConfigFolder() {
    mkdir config
}

downloadPlex() {
    if [[ ! -x plex ]]; then
        echo "Downloading Plex..."
        setOSandArch
        
        if [ "$OS" = "darwin" ]
        then
            if [ "$ARCH" = "amd64" ] || [ "$ARCH" = "x86_64" ]
            then
                curl -sSL https://github.com/labdao/plex/releases/download/v0.3.0/plex_0.3.0_darwin_amd64.tar.gz | tar xvz
            elif [ "$ARCH" = "arm64" ]
            then
                curl -sSL https://github.com/labdao/plex/releases/download/v0.3.0/plex_0.3.0_darwin_arm64.tar.gz | tar xvz
            else
                echo "Cannot install Plex. Unsupported architecture for Darwin OS: $ARCH"
            fi
        elif [ "$OS" = "linux" ]
        then
            if [ "$ARCH" = "amd64" ] || [ "$ARCH" = "x86_64" ]
            then
                curl -sSL https://github.com/labdao/plex/releases/download/v0.3.0/plex_0.3.0_linux_amd64.tar.gz | tar xvz
            else
                echo "Cannot install Plex. Unsupported architecture for Linux: $ARCH"
            fi
        elif [ "$OS" = "windows" ]
        then
            if [ "$ARCH" = "amd64" ] || [ "$ARCH" = "x86_64" ]
            then
                curl -sSL https://github.com/labdao/plex/releases/download/v0.3.0/plex_0.3.0_windows_amd64.tar.gz
            else
                echo "Cannot install Plex. Unsupported architecture for Windows: $ARCH"
            fi
        fi
    fi
}

getAppJsonl() {
    cd config
    curl -sSL -O https://raw.githubusercontent.com/labdao/plex/main/config/app.jsonl
    cd ..
}

getInstructionsTemplateJsonl() {
    cd config
    curl -sSL -O https://raw.githubusercontent.com/labdao/plex/main/config/instruction_template.jsonl
    cd ..
}

getTestData() {
    mkdir -p testdata/binding/pdbbind_processed_size1/6d08 && cd testdata/binding/pdbbind_processed_size1/6d08
    curl -sL -O https://raw.githubusercontent.com/labdao/plex/main/testdata/binding/pdbbind_processed_size1/6d08/6d08_protein_processed.pdb
    curl -sL -O https://raw.githubusercontent.com/labdao/plex/main/testdata/binding/pdbbind_processed_size1/6d08/6d08_ligand.sdf
    cd ../..
    mkdir -p abl && cd abl
    curl -sL -O https://raw.githubusercontent.com/labdao/plex/main/testdata/binding/abl/7n9g.pdb
    curl -sL -O https://raw.githubusercontent.com/labdao/plex/main/testdata/binding/abl/ZINC000003986735.sdf
    curl -sL -O https://raw.githubusercontent.com/labdao/plex/main/testdata/binding/abl/ZINC000019632618.sdf
    cd ../../..
}

displayLogo() {
    logo="
                                        @
                                 @@@@@@@@@@@@@@@
                               @@@@@@@@@@@@@@@@@@@
                              @@@@@@@@@@@@@@@@@@@@@
             @@@@@@@@@@      @@@@@@@@@@@@@@@@@@@@@@@      @@@@@@@@@@
           @@@@@@@@@@@@      @@@@@@@@@@@@@@@@@@@@@@@      @@@@@@@@@@@@
         @@@@@@@@@@@@@@      @@@@@@@@@@@@@@@@@@@@@@@      @@@@@@@@@@@@@@
        *@@@@@@@@@@@@@      @@@@@@@@@@@@@@@@@@@@@@         @@@@@@@@@@@@@
         @@@@@@@@@@        @@@@@@@@@@@@@@@@@@@@@%            &@@@@@@@@@@
           @@@@           @@@@@@@@@@@@@@@@@@&                     @@@@
                        @@@@@@@@
                   @@@@@@@@@
      @@@@@@@@@@@@@@@@@@@@        ,@@@@@@@@@@@                 @@@@@@@@@@@@
   @@@@@@@@@@@@@@@@@@@@@@       @@@@@@@@@@@@@@@@@           @@@@@@@@@@@@@@@@@@
  @@@@@@@@@@@@@@@@@@@@@@      @@@@@@@@@@@@@@@@@@@@@       @@@@@@@@@@@@@@@@@@@@@
 @@@@@@@@@@@@@@@@@@@@@@@     @@@@@@@@@@@@@@@@@@@@@@@      @@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@     @@@@@@@@@@@@@@@@@@@@@@@     @@@@@@@@@@@@@@@@@@@@@@@
 @@@@@@@@@@@@@@@@@@@@@@      @@@@@@@@@@@@@@@@@@@@@@@     @@@@@@@@@@@@@@@@@@@@@@@
  @@@@@@@@@@@@@@@@@@@@@       @@@@@@@@@@@@@@@@@@@@@      @@@@@@@@@@@@@@@@@@@@@@
   @@@@@@@@@@@@@@@@@@           @@@@@@@@@@@@@@@@@       @@@@@@@@@@@@@@@@@@@@@@
      @@@@@@@@@@@@                 @@@@@@@@@@@         @@@@@@@@@@@@@@@@@@@@
                                                     @@@@@@@@@
                                                 @@@@@@@@
           @@@@                     &@@@@@@@@@@@@@@@@@@           @@@@
         @@@@@@@@@@             @@@@@@@@@@@@@@@@@@@@@        &@@@@@@@@@@
        *@@@@@@@@@@@@@        @@@@@@@@@@@@@@@@@@@@@@@      @@@@@@@@@@@@@
         @@@@@@@@@@@@@@      @@@@@@@@@@@@@@@@@@@@@@@      @@@@@@@@@@@@@@
           @@@@@@@@@@@@      @@@@@@@@@@@@@@@@@@@@@@@      @@@@@@@@@@@@
             @@@@@@@@@@      @@@@@@@@@@@@@@@@@@@@@@@      @@@@@@@@@@
                              @@@@@@@@@@@@@@@@@@@@@
                               @@@@@@@@@@@@@@@@@@@
                                 @@@@@@@@@@@@@@@
                                        @
    "
    echo "$logo"
}

makeParentFolder
makeConfigFolder
downloadPlex
getAppJsonl
getInstructionsTemplateJsonl
getTestData
displayLogo

echo "Installation complete. Welcome to LabDAO! Documentation at https://github.com/labdao/plex"
echo "To get started, please run the following 3 steps:"
echo "1. Please change the permissions of plex on your system:"
echo "chmod +x ./plex"
echo "2. Please run the following command to download large bacalhau results:"
echo "sudo sysctl -w net.core.rmem_max=2500000"
echo "3. To start using Plex, run the following command to run Equibind on test data:"
echo "./plex -app equibind -input-dir ./testdata/binding/pdbbind_processed_size1/"
