#!/usr/bin/python

import subprocess
import sys
import json, simplejson, copy
import random
import time, re
import logging


#casperCommand = "/usr/local/lib/node_modules/casperjs/bin/casperjs --ssl-protocol=tlsv1"
casperCommand = "c:/casperjs/bin/casperjs"
#scriptPath = "/home/delano/js"
scriptPath = "c:/js"
#executable = '/bin/bash'
executable = 'c:/windows/system32/cmd.exe'
logFilePath = "c:/tmp/autolease.log"

logging.basicConfig(filename=logFilePath, filemode='a',
                    format='%(asctime)s - %(message)s', 
                    level=logging.INFO)

def runCommand(cmdLine):
    #print(cmdLine)
    process = subprocess.Popen(cmdLine,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        executable=executable,
        shell=True)

    out, err = process.communicate()
    #print("out = {}\nerr = {}".format(out, err))
    return (process.returncode, out.decode('utf-8'))

def findUnassignedAircraft(game_id):
    command_line = ("{} "
        "{}/get_unassigned.js "
        "--game_id={}"
        " --silent"
        ).format(casperCommand, scriptPath, game_id)
    logging.info(command_line)
    (returncode, output) = runCommand(command_line)
    print("findUnassignedAircraft:\n{}\n{}".format(returncode, output))

    try:
        status = json.loads(output)
    except:
        status = False
        returncode = 1

    return (output, returncode, status)

def getGaps(path, game_id):
    command_line = ("{} "
        "{}/timetable_gaps.js "
        "--game_id={} --silent").format(casperCommand, scriptPath, game_id)
    logging.info(command_line)
    (returncode, output) = runCommand(command_line)
    print("getGaps:\nreturncode = {}\noutput = ###{}###".format(returncode, output))
    

    #print('timetable_gaps.js returned {0}'.format(returncode))
    
    if path is not None:
        testfile = open(path, "w")
        testfile.write(re.sub(r'[\r\n]+', '\n', output))
        testfile.close()

    gaps = json.loads(output)

    return (output, returncode, gaps)


def leaseAircraft(game_id, fleet_type_id, seat_config_id, base_airport_iata,
            max_distance_nm, model):
    # get leased aircraft
    command_line = ("{} "
            "{}/lease_aircraft.js --silent "
            "--game_id={} "
            "--fleet-type-id={} "
            "--seat-config-id={} "
            "--base={} "
            "--range={} "
            "--keyword=\\\"{}\\\"").format(casperCommand, scriptPath, game_id,
                           fleet_type_id, seat_config_id, 
                           base_airport_iata, max_distance_nm, model)
    logging.info(command_line)
    (returncode, output) = runCommand(command_line)
    print("leaseAircraft:\n{}\n{}".format(returncode, output))

    #print('lease_aircraft.js returned {0}'.format(returncode))
    if returncode != 0:
        #print(output)
        #sys.exit(1)
        return False, output
    newAircraft = simplejson.loads(output)
    #newAircraft = json.loads(output)
    
    return True, newAircraft


def getUnassigned(game_id, unassigned, fleet_type_id, base_airport_iata,
    max_distance_nm, model):
    if unassigned is None or len(unassigned) == 0:
        return False, { 'error' : 'No unassigned avlbl' }
        
    output = None
    retVal = False
        
    for ac in unassigned:
        if (not (int(ac['fleet_type_id']) == fleet_type_id 
        and  ac['model_description'] == model
        and int(ac['range']) >= int(max_distance_nm))):
            continue
            
        # rebase if needed
        if ac['base_airport_iata'] != base_airport_iata:
            command_line =("{} " 
                "{}/rebase.js --silent "
                "--game_id={} "
                "--aircraft-id={} " 
                "--to={} ").format(casperCommand, scriptPath, game_id, 
                                   ac['aircraft_id'], base_airport_iata)
            logging.info(command_line)
            (returncode, output) = runCommand(command_line)
            print("getUnassigned:\n{}\n{}".format(returncode, output))

            res = simplejson.loads(output)
            if res['success'] != 'true':
                return False, { 'error' : res['error']    }
                
        output = copy.deepcopy(ac)
        unassigned.remove(ac)
        break
        
    if output is not None:
        retVal = True
        
    return retVal, output
    
localtime = time.asctime( time.localtime(time.time()) )
#print ("\n---- {} ----".format(localtime))

if len(sys.argv) < 2:
    print("Bad args")
    sys.exit(1)

game_id = int(sys.argv[1])
if game_id <= 0:
    logging.error("Bad game_id [{}]".format(sys.argv[1]))
    sys.exit(1)

# find unassigned frames first
output, returncode, unassigned = findUnassignedAircraft(game_id)
print(output, returncode, unassigned)

gaps_file = "c:/tmp/gaps.json"
useOldGapsFile = False
if len(sys.argv) > 2 and sys.argv[2] == '--test':
    useOldGapsFile = True

# get all timetable gaps
gaps = []
try:
    if useOldGapsFile:
        testfile = open(gaps_file, "r")
        gaps = json.load(testfile)
        testfile.close()
    else:
        output, returncode, gaps = getGaps(gaps_file, game_id)
        if returncode != 0:
            raise Exception(output)
except (Exception) as e:
    logging.error("Failed to get data {}".format(str(e)))
    sys.exit(1)

print(output, returncode, gaps) 
    
seat_config_map = {
    "Boeing 737-300": 4485,
    "Boeing 737-400" : 4486,
    "Boeing 737-800" : 2703,
    'Boeing 737-700ER': 4099 ,
    'Boeing 767-200ER': 1163 ,
    'Boeing 767-300ER': 1658 
}

indexes = list(range(0, len(gaps)))
random.shuffle(indexes)
UAMAvailable = True

for i in indexes:
    if not (UAMAvailable or len(unassigned) > 0):
        break

    timetable = gaps[i]
    #print(timetable)

    # ignore timetables where nothing has been allocated yet
    if (timetable['unassignedCount'] == 7
    or  timetable['unassignedCount'] == 0):
    #or not ('model' in timetable['lastAircraft'])):
        continue

    # ignore timetables where no seat config available
    #if timetable['lastAircraft']['model'] not in seat_config_map:
    #    continue

    seat_config_id = 0#seat_config_map[timetable['lastAircraft']['model']]
    
    # try looking in unassigned list first
    status, newAircraft = getUnassigned(game_id, unassigned, 
        timetable['fleet_type_id'], timetable['base_airport_iata'],  
        timetable['max_distance_nm'], timetable['lastAircraft']['model'])
    
    # if no unassigned plane found, try UAM 
    if status == False and UAMAvailable:
        status, newAircraft = leaseAircraft(game_id, 
            timetable['fleet_type_id'], seat_config_id, 
            timetable['base_airport_iata'],  timetable['max_distance_nm'], 
            timetable['lastAircraft']['model'])

        #print(status, newAircraft)
        if newAircraft['error'] != '':
            logging.error(newAircraft['error'])
            if newAircraft['error'] == "UAM unavailable":
                UAMAvailable = False
                continue
        else:
            status = True
            
    # only go ahead if aircraft obtained
    #print(newAircraft)
    if not status:
        continue


    logging.info("{},{},{},{}".format(timetable['name'],
        timetable['fleet_type_id'],
        timetable['base_airport_iata'],
        newAircraft['registration']))

    # do next day aircraft
    command_line =("{} " 
        "{}/next.js "
        "--game_id={} "
        "--slots --silent "
        "--from-aircraft={} " 
        "--to-aircraft={} ").format(casperCommand, scriptPath, game_id,
        timetable['lastAircraft']['registration'],
        newAircraft['registration'])
    logging.info(command_line)
    (returncode, output) = runCommand(command_line)

    #print('next.js returned {0}'.format(returncode))
    if returncode != 0:
        logging.info(output)
        #sys.exit(1)

    timetable['unassignedCount'] = timetable['unassignedCount'] - 1
    timetable['lastAircraft']['registration'] = newAircraft['registration']

# write out gap file
simplejson.dumps(gaps, indent=4 * ' ')
testfile = open(gaps_file, "w")
testfile.write(simplejson.dumps(gaps, indent=4 * ' '))
testfile.close()