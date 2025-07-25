#!/bin/sh
#
# install_ic.sh
#
# Copyright (c) 2020, 2024, Oracle and/or its affiliates. 
#
#    NAME
#      install_ic.sh - Install the Instant Client bits from .dmg files
#
#    DESCRIPTION
#      This file copies the contents of .dmg files to a standard location
#      like: /Users/$USER/Downloads/instantclient_23_3
#
#    NOTES
#      Usage:
#        sh install_ic.sh
#

LS=/bin/ls
CP=/bin/cp
ECHO=/bin/echo
MKDIR=/bin/mkdir
BNAME=/usr/bin/basename
RM=/bin/rm

SRCDIRS=`${LS} -d /Volumes/instantclient-*-macos.arm64-*`

DEST=/Users/${USER}/Downloads/instantclient_23_3
${ECHO} $DEST

COPY_OPTIONS="-R -P -f"

for i in $SRCDIRS
do
  DIRN=${DEST}

  if (test -d ${DIRN})
  then
    ${ECHO} "Using existing dir: ${DIRN}..."
  else
    ${ECHO} "Creating dir: ${DIRN}..."
    ${MKDIR} -p ${DIRN}
  fi

  ${ECHO} "Copying ${i} files ..."
  ${CP} ${COPY_OPTIONS} ${i}/* ${DIRN}/

  if (test -f ${DIRN}/`${BNAME} "$0"`)
  then
    ${RM} -f ${DIRN}/`${BNAME} "$0"`
  fi

  if (test -f ${DIRN}/INSTALL_IC_README.txt)
  then
    ${RM} -f ${DIRN}/INSTALL_IC_README.txt
  fi
done
