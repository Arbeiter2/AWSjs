#!/bin/bash

SCRIPT_PATH="/home/delano/js"
LOCKFILE_PATH="/var/tmp"
COOKIES="--cookies-file=${SCRIPT_PATH}/cookies2.txt"

PATH=/opt/apache-jena-3.0.0/bin:/opt/weka:/home/delano/perl5/bin:/opt/apache-jena-3.0.0/bin:/opt/weka:/home/delano/perl5/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/usr/local/hadoop/bin:/usr/local/hadoop/sbin:/usr/local/lib/node_modules/casperjs/bin:/usr/local/lib/node_modules/phantomjs/bin:/usr/local/hadoop/bin:/usr/local/hadoop/sbin


SELF=$0
ARGV=( "$@" )

usage()
{
	echo "$SELF (start|stop|status) <script-name> arg1 arg2 .... argn"
	exit 1
}

if [ "$#" -lt 2 -o ! -f "${SCRIPT_PATH}/${ARGV[1]}" ]
then
	usage
fi



# ARG now contains only the arguments to the script (if any)

start_command()
{
# lock file check
if [ -r "${LOCKFILE_PATH}/${SCRIPT_NAME}.lock" ]
then
	# check whether command is running
	CMD_CNT=`ps -ef | egrep -e "js.*${SCRIPT_NAME}" | grep -v grep | wc -l`

	# if it is, die
	if [ ${CMD_CNT} -gt 0 ]
	then
		echo "${ARGV[1]} currently running"
		exit 0
	else # phantom lockfile, so delete
		rm "${LOCKFILE_PATH}/${SCRIPT_NAME}.lock"
	fi
fi
echo $$ > ${LOCKFILE_PATH}/${SCRIPT_NAME}.lock

#echo /usr/local/bin/casperjs ${COOKIES} ${SCRIPT_PATH}/${SCRIPT_NAME} ${ARGV[*]}
/usr/local/lib/node_modules/casperjs/bin/casperjs ${COOKIES} ${SCRIPT_PATH}/${SCRIPT_NAME} ${ARGV[*]}

rm ${LOCKFILE_PATH}/${SCRIPT_NAME}.lock
}

stop_command()
{
if [ -r "${LOCKFILE_PATH}/${SCRIPT_NAME}.lock" ]
then
	PID=`cat "${LOCKFILE_PATH}/${SCRIPT_NAME}.lock"`

    # check whether command is running
    CHILD_PID=`ps -ef | egrep -e "${PID} .*js .*${SCRIPT_NAME}" | grep -v grep | tr -s ' '| cut -f2 -d' '`

    # if it is, die
    if [[ ${CHILD_PID} ]]
    then
        kill -9 ${CHILD_PID}
    fi
	echo "${SCRIPT_NAME} killed"
else
	echo "${SCRIPT_NAME} not running"
fi
}

get_status()
{
if [ -r "${LOCKFILE_PATH}/${SCRIPT_NAME}.lock" ]
then
	PID=`cat "${LOCKFILE_PATH}/${SCRIPT_NAME}.lock"`

    # check whether command is running
    CMD_CNT=`ps -ef | egrep -e "${PID} .*js .*${SCRIPT_NAME}" | grep -v grep | wc -l`

    # if it is, die
    if [ ${CMD_CNT} -gt 0 ]
    then
		echo "${SCRIPT_NAME} running with pid ${PID}"
	else
		rm "${LOCKFILE_PATH}/${SCRIPT_NAME}.lock"
		echo "${SCRIPT_NAME} not running"
    fi
else
	echo "${SCRIPT_NAME} not running"
fi
}

COMMAND="${ARGV[0]}"
SCRIPT_NAME="${ARGV[1]}"
unset ARGV[0]
unset ARGV[1]

case ${COMMAND} in
start)
	start_command
	;;
stop)
	stop_command
	;;
status)
	get_status
	;;
*)
	echo "Bad command [${COMMAND}]"
	usage
	;;
esac

