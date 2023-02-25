/*
	Change Username line 14
	Change Password line 15
	Change Logfile  line 18
*/


const fs = require('fs');
const readline = require('readline');
var url = require('url');

var myArgs = process.argv.slice(2);
var host = "baiaustraliauat";
var username = "admin";
var password = "Aksras@123";
var auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
var query = "";
var logfile = "/root/getlogdev.log";

if (myArgs[0]) {
	host+=myArgs[0]+".service-now.com";
} else {
	host+=".service-now.com";
}

console.log("[" + host + "] ");

const https = require('https')
const options = {
  hostname: host,
  port: 443,
  // path: '/api/now/table/syslog?sysparm_limit=20000&sysparm_query='+encodeURIComponent(query), 
  method: 'GET',
  headers: {
        Authorization: auth
  }
}

getUserID(getUserIDResponse);

function getUserIDResponse(resp) {
	// console.log("getUserIDResponse: " + resp.sys_id);

	getMyBookmarks(resp.sys_id, getMyBookmarksResponse);

}

function getMyBookmarksResponse(resp) {
	for (var idx=0; idx<resp.length; idx++) {
		console.log("[" + idx + "] " + resp[idx].title);
	}
	const rl = readline.createInterface({
	  input: process.stdin,
	  output: process.stdout
	});

	rl.question('WTF you want to see? ', (answer) => {
  		// TODO: Log the answer in a database
  		var hit = false;
  		console.log(`OK, cool: ${answer}`);

  		rl.close();

  		for (var idx=0; idx<resp.length; idx++) {
			// console.log(answer + " [" + idx + "] " + resp[idx].title);
			if (answer == idx) {
				// console.log("HIT");
				hit = true;
				// console.log("HIT: "+resp[idx].url);
				var url_parts = url.parse(resp[idx].url, true);
				// console.log("HIT2: "+JSON.stringify(url_parts, null, 4));
				var query = url_parts.query.sysparm_query;
				getLogs(query);
			}
		}

		if (!hit) {
			console.log("NO HIT");
			setTimeout(function() {
				getUserID(getUserIDResponse);
			}, 2000);
		}
	});
	//sleep(1000);
}

function getUserID(callback) {
	let obj = {};
	options.path = '/api/now/table/sys_user?sysparm_query='+encodeURIComponent("user_name=" + username);
	const req = https.request(options, res => {
		let data = '';

		res.on('data', (chunk) => {
	    	data += chunk;
	  	});

	  	res.on('end', () => {
	  		obj = JSON.parse(data);
	  		console.log("Email: " + obj.result[0].email + "\n\n");
	  		return callback(obj.result[0]);
	  	});
	});

	req.on('error', error => {
	  console.error(error)
	})

	req.end()
}

function getMyBookmarks(_id, callback) {
	
	let obj = {};
	options.path = '/api/now/table/sys_ui_bookmark?sysparm_query='+encodeURIComponent("user=" + _id + "^urlLIKEsyslog");
	const req = https.request(options, res => {
		let data = '';

		res.on('data', (chunk) => {
	    	data += chunk;
	  	});

	  	res.on('end', () => {
	  		obj = JSON.parse(data);
	  		// console.log("BOOKMARKS" + JSON.stringify(obj, null, 4));
	  		return callback(obj.result);
	  	});
	});

	req.on('error', error => {
	  console.error(error)
	})

	req.end()
}

function getLogs(_query) {
	// console.log("getLogs Query: " + _query)
	options.path = '/api/now/table/syslog?sysparm_limit=200000&sysparm_query='+encodeURIComponent(_query);
	const req = https.request(options, res => {
		let data = '';
		let msg = [];
	  	// console.log(`statusCode: ${res.statusCode}`)

		res.on('data', (chunk) => {
	    	data += chunk;
	  	});

	  	res.on('end', () => {
	    //process.stdout.write(d)
	    var obj = JSON.parse(data)
	    // console.log("getLogs LEN: " + obj.result.length)
	    for (var idx=0; idx<obj.result.length; idx++) {
			// console.log(obj.result[idx].message); 
			msg.push(obj.result[idx].message);   	
	    }
	    msg.sort();

	    fs.readFile(logfile, function(err, data) {
			if (err) {
				console.error(err);
				return;
			}
			let dataNew = msg.join("\n");
			if (data && data.length !== dataNew.length) {
				console.log("Ups - need refresh ... ");
		
				console.log(msg.join("\n"));
				msg.reverse();
		
				fs.writeFile(logfile, msg.join("\n"), function(err) {
					if (err) {
						return console.log(err);
					}
					console.log(`statusCode: ${res.statusCode} - File saved ...`);
				});
			}
		});		
	     
		setTimeout(function() {
			getLogs(_query)
		}, 3000);	
	  })
	})

	req.on('error', error => {
	  console.error(error)
	})

	req.end()

	
}



