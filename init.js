'use strict';

var config;
var redisPool = require('redis');
var sleep = require('system-sleep');
var isNumber = require("isnumber")
var clientPool;
var cursor = '0';
var creditBlocks = [];
var removeCount = 0;
var backupfs = require('fs');
var backupFilename = "";

function readConfig() {
	var fs = require('fs');
	var file = __dirname + "/" + (process.argv.length > 2 ? process.argv[2] : 'config.json');

	fs.readFile(file, 'utf8', function (err, data) {
		if (err) {
			console.log('Error: ' + err);
			return;
		}
		config = JSON.parse(data);

		console.log("Redis(Pool) endpoint: ", config.redisPool.host + ":" + config.redisPool.port);
	});
}

function removeOldCredit() {
    clientPool = redisPool.createClient(config.redisPool.port, config.redisPool.host);
	if(config.redisPool.password.length > 0) {
		clientPool.auth(config.redisPool.password);
	}

	clientPool.on("error", function (err) {
		console.log("Error(pool) " + err);
	});

	scanKeys();
}

function scanKeys() {
	clientPool.scan(cursor, 'MATCH', config.coin + ':credits:*', 'COUNT', '1000', function(err, reply) {
		try {
			if(err) {
				console.error("Redis scan error. " + err);
				return;
			}

			cursor = reply[0];
			var lists = reply[1];

			for(var row in lists) {
				var key = lists[row];
				var arr = key.split(':');
				var strBlock = arr[2];
				var blockNumber = isNumber(strBlock) ? parseInt(strBlock, 10) : 0;

				if(blockNumber > 0 && strBlock !== "immature" && strBlock !== "all") {
					creditBlocks.push({blockNumber: blockNumber, key: key});
				}
			}

			if(cursor === '0') {
				var totalCount = creditBlocks.length;
				console.log('Scan Complete. Total blocks: ' + totalCount);

				removeCount = totalCount - config.aliveBlocks;

				if(removeCount > 0) {
					creditBlocks.sort(function(a, b){
						if(a.blockNumber > b.blockNumber) return 1;
						else if(a.blockNumber < b.blockNumber) return -1;
						return 0;
					});

					console.log('Deleting ' + removeCount + ' blocks.');
					if(config.backup) {
						var now = new Date();

						backupFilename = config.backupPath + "credit-" + creditBlocks[0].blockNumber + "-" + creditBlocks[removeCount - 1].blockNumber + ".backup";
					}

					backupBlock(0);
				}
				else {
					console.log('No blocks to delete.');
					process.exit();
				}
			}
			else {
				scanKeys();
			}
        } catch (e) {
			console.error(e.message);
		}
	});
}

function backupBlock(row) {
	var blockNumber = creditBlocks[row].blockNumber;
	var key = creditBlocks[row].key;

	if(config.backup) {
		clientPool.hgetall(key, function(err, reply) {
			for(var hash in reply) {
				var data = 'hset "' + key + '" "' + hash + '" "' + reply[hash] + '"';
				backupfs.appendFileSync(backupFilename, data + "\n");
			}

			removeBlock(row, blockNumber, key);
		});
	}
	else {
		removeBlock(row, blockNumber, key);
	}
}

function removeBlock(row, blockNumber, key) {
	var blockNumber = creditBlocks[row].blockNumber;
	var key = creditBlocks[row].key;

	if(row % 100 == 99) {
		console.log('Deleted ' + (row + 1) + ' blocks.');
	}

	clientPool.del(key, function(err, reply) {
		row++;
		if(row < removeCount) {
			backupBlock(row);
		}
		else {
			// Complete!!
			console.log('Delete Complete.');
			process.exit();
		}
	});
}

(function init(){
	console.log('Start remove old credits ' + new Date());

	readConfig();
	sleep(500);

	removeOldCredit();
})();
