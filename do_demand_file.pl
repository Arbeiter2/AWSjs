#!/usr/bin/perl

use strict;

sub usage()
{
	print "$0 <ICAO base code> <fleet-type-id> <min-load> <max-range> <max-flights> <file>\n";
	exit(1);
}

usage() if (@ARGV < 4);
usage() if ($ARGV[0] !~ /^[A-Z]{4}$/);
usage() if ($ARGV[1] !~ /^\d+$/);
usage() if ($ARGV[2] !~ /^\d+$/);
usage() if ($ARGV[3] !~ /^\d+$/);
usage() if ($ARGV[4] !~ /^\d+$/);
usage() if (! -r $ARGV[5]);

my ($base_airport_icao, $fleet_type_id, $min_load, $max_range, $max_flights, $file_name) = @ARGV;

# ICAO,IATA,dist_nm,demand,supply,my_supply
# KLGA,LGA,1204,1560,0,0
# KLAS,LAS,915,1430,1067,0
# KDTW,DTW,856,1110,738,0

print "var flightData = [\n";
open(FH, "< $file_name") || die "Error opening $file_name: $!";
while (<FH>)
{
	chomp;
	my @fields = split(/,/);
	next if ($fields[2] !~ /^\d+/);
	next if ($fields[2] > $max_range);
	my $supply = ($fields[4] > $fields[5] ? $fields[4] : $fields[5]);
	my $demand = $fields[3] - $supply;
	#print "$_ $demand\n";
	next if ($demand < $min_load);
	my $count = int($demand/$min_load);

	my $s = "{ 'from_icao_code': '$base_airport_icao', " . 
			"'to_icao_code': '$fields[0]', " .
			"'to_iata_code': '$fields[1]', " .
			"'fleet_type_id': '$fleet_type_id', " .
			"'count': " . ($count < $max_flights ? $count : $max_flights) . "},\n";
	print($s);
}
close(FH);
print "];\n";
