const http = require('http');
var url = require('url');

const hostname = '127.0.0.1'; //localhost
const port = 3000; //whatever local port I guess?
const TORRENT_PORT = 8080; //set to torrent settings
const user = 'username';
const pw = 'password';
const auth = user + ":" + pw; // useless?
var dir = 'C:\\Test\\Test\\'; //windows directory from utorrent settings, might change this later to be automatic
var token;

var cacheID;
var runningTorrents = {};
var checkTimer;
var tokenTimer;

var saveName = "savedTorrents.json"; //custom name if you want


function getTorrentToken(){


var request = require('request');
	var tokenUrl = "http://" + hostname + ":" + TORRENT_PORT + "/gui/token.html";
	
	request({
		url: tokenUrl, //URL to hit
		method: 'GET', //Specify the method
		'auth': {
			'user': user,
			'pass': pw
		}
	}, function (error, response, body) {
		//Check for error
		if(error){
			return console.log('Error:', error);
		}

		//Check for right status code
		if(response.statusCode !== 200){
			return console.log('Invalid Status Code Returned:', response.statusCode);
		}

		//All is good. Print the body
		processToken(body);

	});

}



function processToken(html){

	token = html.substring(44, html.length-13); // too dumb to parse the proper way
	if(!cacheID){
		getCacheID();
	}

}

function startTokenTimer(){

	tokenTimer = setInterval(function(){
		
		console.log("Token timer FIRED OFF");
		getTorrentToken();
	
	  console.log('test');
	}, 1000*60*25); //25 minutes  
}


function sendErrorResponse(clientResponse, message){
		
		clientResponse.writeHead(400, {
			"Content-Type": "text/plain",
			"Access-Control-Allow-Origin": "*"
		});
		
		clientResponse.end(message);

}


function sendSuccessResponse(clientResponse, message){
	
		clientResponse.writeHead(200, {
			"Content-Type": "text/plain",
			"Access-Control-Allow-Origin": "*"
		});
			
		clientResponse.end(message);
}


function addTorrent(link, title, clientResponse){

	var request = require('request');
	var addUrl = "http://" + hostname + ":" + TORRENT_PORT + "/gui/?action=add-url&token=" + token + "&s=" + link;
	//console.log(link);
	
	request({
		url: addUrl, //URL to hit
		method: 'GET', //Specify the method
		'auth': {
			'user': user,
			'pass': pw
		}
	}, function (error, response, body) {
		//Check for error
		if(error){
		
			sendErrorResponse(clientResponse, "Could not add the torrent, check if your client is on");
			return console.log('Error:', error);
		}

		//Check for right status code
		if(response.statusCode !== 200){
			sendErrorResponse(clientResponse, "Could not add the torrent, check if your client is on");
			return console.log('Invalid Status Code Returned:', response.statusCode);
		}

		//All is good. Print the body
		//var strippedHash = stripHash(link);
		
		addToDownloadQueue(link, title, clientResponse);
		//setTimeout(function () {
		  //moveOntoDownloadingList(strippedHash, title);
		//}, 20000);
		
		
		
		

	});

}

function stripHash(link){
	var firstBreak = link.lastIndexOf('/');
	var lastBreak = link.lastIndexOf('.');
	var hash = link.substring(firstBreak+1, lastBreak);
	return hash.toUpperCase();

}





function addToDownloadQueue(link, title, clientResponse){

	

	
	//console.log("JSON: " + json.files);
	//console.log("JSON files array size: " + json.files[1].length);
	
	var request = require('request');
	request({
		url: link, //URL to hit
		method: 'GET', //Specify the method
		encoding: null
	}, function (error, response, body) {
		//Check for error
		if(error){
			sendErrorResponse(clientResponse, "Error loading the torrent, try manually");
			return console.log('Error:', error);
		}

		//Check for right status code
		if(response.statusCode !== 200){
			sendErrorResponse(clientResponse, "Error loading the torrent, try manually");
			return console.log('Invalid Status Code Returned:', response.statusCode);
		}
		
		
		
		"Successfully added the torrent"
		var parseTorrent = require('parse-torrent');
		var torrentInfo;
		try{
			torrentInfo = parseTorrent(body);
		}catch(err){
			console.log(err.message);
			sendErrorResponse(clientResponse, "Failure to read the torrent file, try downloading manually the normal way, not sure how to fix this"); // can't add these files through url? try through torrent file maybe
			return;
		}
		
	
		var filename = sanitizeTitle(torrentInfo.name);
		var hash = torrentInfo.infoHash.toUpperCase();
		
		var format;
		if(torrentInfo.files.length > 1){
			format = null
		} else {
			format = getFileFormat(filename);
		}

		
		var newname = sanitizeTitle(title); //remove backslashes etc
		if(format){
			newname += format;
		}
		
		console.log("Old name: " + filename);
		console.log("Format:"+ format);
		console.log("New name: " + newname);
		console.log("");
		
		var names = {
			oldname : filename,
			newname : newname
		};

		//console.log("queue check");
		if (!(hash in runningTorrents)){
			console.log("hash not found in queue, good");
			sendSuccessResponse(clientResponse, "File successfully added");
			if(Object.keys(runningTorrents).length < 1){
				console.log("queue empty, start timer");
				runningTorrents[hash] = names;
				prepareTimer();	
				
				
			}
			else {
				console.log("queue already has some stuff in it, no new timer");
				runningTorrents[hash] = names;
			
			}
		}
		saveToFile();
	});
}


function saveToFile(){


	
	var jsonfile = require('jsonfile');
 
	var file = __dirname + "//" + saveName;
	var obj = runningTorrents;
	 
	jsonfile.writeFile(file, obj, function (err) {
		if(err){
		console.error("SAVING ERROR: " + err);
		} else {
		console.log("Latest queue update saved successfully");
		}
	   
	});

}


function readFromFile(){
	
	var jsonfile = require('jsonfile');
	var file = __dirname + "//" + saveName;
	
	jsonfile.readFile(file, function(err, obj) {
	
		if(err){
			console.log("Couldn't load the save file, make sure it's in the same directory as the server script");
		} else{
			checkForChanges(obj);
			console.dir(obj);
		}
	  
	})
}

//compare against users current torrent list to determine deleted/already finished torrents and remove them from running list
function checkForChanges(obj){

	var request = require('request');
	var getUrl = "http://" + hostname + ":" + TORRENT_PORT + "/gui/?list=1&token=" + token;
	request({
		url: getUrl, //URL to hit
		method: 'GET', //Specify the method
		'auth': {
			'user': user,
			'pass': pw
		}
	}, function (error, response, body) {
		//Check for error
		if(error){
			return console.log('Error:', error);
		}

		//Check for right status code
		if(response.statusCode !== 200){
			return console.log('Invalid Status Code Returned:', response.statusCode);
		}
		
		
		/*
		console.log("Full obj: " + obj);
		for(var key in obj){
			if (obj.hasOwnProperty(key)) { // this will check if key is owned by data object and not by any of it's ancestors
				//console.log(key +': '+obj[key].oldname); // this will show each key with it's value
				//console.log(key +': '+obj[key].newname);
				
			}
			
		}
		*/
		
		
		
		var json = JSON.parse(body);
		var torrents = json.torrents;
		
		//console.log("torrent length: " + torrents.length);
		for(var i = 0; i<torrents.length; i++){
		
			//console.log(torrents[i][0]);
			var key = torrents[i][0];
			if(key in obj && (torrents[i][4] < 1000)){ //1000 in milles = 100
				var names = {
					oldname : obj[key].oldname,
					newname : obj[key].newname
				};
				runningTorrents[key] = names;
				console.log("HASH FOUND IN LOADED ARRAY");
			}
		}
		if(Object.keys(runningTorrents).length > 0){
			prepareTimer();
		}
		saveToFile();
		cacheID = json.torrentc; //quick fix to make sure things stay the same for timer

	});
		
		

}


//add support for other illegal characters in windows
function sanitizeTitle(title){

	var freshTitle = title.replace(/[\\\/:*?"<>|]/g, '');
	
	return freshTitle;
}


function getFileFormat(filename){

	var dotIndex = filename.lastIndexOf('.');
	//console.log("last index: " + dotIndex);
	if(dotIndex == -1){
		return null;
	}
	
	if(dotIndex + 4 < filename.length){
		return null;
	}
	
	return filename.substring(dotIndex, filename.length);

}


function getCacheID(){

	var request = require('request');
	var getUrl = "http://" + hostname + ":" + TORRENT_PORT + "/gui/?list=1&token=" + token;
	request({
		url: getUrl, //URL to hit
		method: 'GET', //Specify the method
		'auth': {
			'user': user,
			'pass': pw
		}
	}, function (error, response, body) {
		//Check for error
		if(error){
			return console.log('Error:', error);
		}

		//Check for right status code
		if(response.statusCode !== 200){
			return console.log('Invalid Status Code Returned:', response.statusCode);
		}

		var json = JSON.parse(body);
		
		cacheID = json.torrentc;
		console.log(cacheID);
	});
}


function prepareTimer(){

	
	console.log("Starting timer");
	checkTimer = setInterval(function(){
		
		console.log("Timer FIRED OFF");
		processChanges();
	
	  console.log('test');
	}, 30000);    

}



function processChanges(){
	
	var request = require('request');
	var getUrl = "http://" + hostname + ":" + TORRENT_PORT + "/gui/?list=1&token=" + token +"&cid=" + cacheID;
	request({
		url: getUrl, //URL to hit
		method: 'GET', //Specify the method
		'auth': {
			'user': user,
			'pass': pw
		}
	}, function (error, response, body) {
		//Check for error
		if(error){
			return console.log('Error:', error);
		}

		//Check for right status code
		if(response.statusCode !== 200){
			return console.log('Invalid Status Code Returned:', response.statusCode);
		}
		
		
		
		var json = JSON.parse(body);
		//console.log(json);
		for(var i = 0; i<json.torrentp.length; i++){
		
			var torrent = json.torrentp[i];
			
			

			if((torrent[0] in runningTorrents) && (torrent[4] >= 1000)){ //progress in permilles (1000 = 100 in %)
				console.log("File Downloaded");
				//console.log(torrent);
				
				var runningTorrent = runningTorrents[torrent[0]];
				//remove torrent from utorrent when completed
				if(runningTorrent.oldname != null){ //if not folder, use normal oldname
					deleteTorrent(torrent[0], runningTorrent.oldname, runningTorrent.newname);
				}
				else{ //if folder, fallback on name from torrent
					console.log("Secondary name: " + torrent[2]);
					deleteTorrent(torrent[0], torrent[2], runningTorrent.newname);
				}
				
				
				delete runningTorrents[torrent[0]];
				saveToFile();
				//console.log("");
				if(Object.keys(runningTorrents).length < 1){
					console.log("Timer cleared");
					clearInterval(checkTimer);
				}
				
			}			
		}
		//handle removing torrents deleted off-screen here maybe (getfiles and scan?)
	
		
		
		cacheID = json.torrentc;
	});

}

function deleteTorrent(hash, oldname, newname){


	var request = require('request');
	//console.log(hash);
	var deleteUrl = "http://" + hostname + ":" + TORRENT_PORT + "/gui/?action=remove&token=" + token + "&hash=" + hash;
	request({
		url: deleteUrl, //URL to hit
		method: 'GET', //Specify the method
		'auth': {
			'user': user,
			'pass': pw
		}
	}, function (error, response, body) {
		//Check for error
		if(error){
			return console.log('Error:', error);
		}

		//Check for right status code
		if(response.statusCode !== 200){
			return console.log('Invalid Status Code Returned:', response.statusCode);
		}
		//console.log(body);
		console.log("File Successfully removed: " + oldname);
		
		//rename here
		setTimeout(function () {
		  renameFile(oldname, newname);
		}, 1500);
		
		
	});
				

}


function renameFile(oldname, newname){

	var fs = require('fs');
	
	//check if file already exists, otherwise it gets overwritten
	
	fs.rename(dir + oldname, dir + newname, function(err) {
		if ( err ) {
			console.log('ERROR: ' + err);
		}
	});

}








const server = http.createServer((request, response) => {

	var queryData = url.parse(request.url, true).query;

	  
	if (queryData.link && queryData.title) {
		// user told us their name in the GET request, ex: http://host:8000/?name=Tom
		
		var link = queryData.link;
		var title = decodeURIComponent(queryData.title);
		
		
		if(token){
			addTorrent(link, title, response);
		}
		else{
			
			sendErrorResponse(response, "Could not load token, check your client");
			
		}
		
		
	} else {
			sendErrorResponse(response, "Invalid query parameters");
	}
  
  
  
});

server.listen(port, hostname, () => {

	getTorrentToken(); //add timer for 30min here to refresh token/and check somewhere for utorrent quits
	startTokenTimer();
	readFromFile();
	console.log(`Server running at http://${hostname}:${port}/`);
});