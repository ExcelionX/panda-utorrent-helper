// ==UserScript==
// @name        inline test #7 test
// @namespace   exh
// @description Inlines torrent into to gallery view in sadpanda & regular panda, and allows for quick torrent configuration.
// @include     http://exhentai.org/g/*
// @include     https://exhentai.org/g/*
// @include			http://g.e-hentai.org/g/*
// @include			https://g.e-hentai.org/g/*
// @connect 	127.0.0.1
// @version     1
// @grant       GM_xmlhttpRequest
// @grant       GM_notification
// ==/UserScript==



var host = "127.0.0.1";
var localport = 3000;


var link = getTorrentLink();
processTorrentHTML(link);
console.log("test");
console.log(link);



function getTorrentLink() {
  var EXTRACT_URL_REGEX = /http.*\.php\?[a-zA-Z0-9&=]*/
  var linkElm = document.getElementsByClassName('g2')[1].lastChild;
  var link = linkElm.getAttribute('onclick').match(EXTRACT_URL_REGEX);
  
  return link[0];
}

function httpGetAsync(theUrl, callback){
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200){
            callback(xmlHttp.responseText);
		}
		if(xmlHttp.readyState == 4 && xmlHttp.status > 399){
		
			handleError(xmlHttp.responseText);
		}
    }
	xmlHttp.onerror = function(){
		 handleError("Unable to connect to the server!");
	}
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 

    xmlHttp.send(null);
}

function handleError(error){
    
    
    var notificationDetails = {
    text: error,
    title: 'Unable to download the torrent!',
    timeout: 5000
    };
    GM_notification(notificationDetails);
	console.log(error);
}



function processTorrentHTML(link){
	httpGetAsync(link, callbackHTML);
}


function callbackHTML(html){

	
	var data = extractTorrentInfoFromHTML(html);
    var formCount = 0;
	
	if(data.length > 0){
		htmlFragment = document.createElement('div');
		htmlFragment.className = 'gm torrent-info';
		htmlFragment.style.background="inherit";
		
		for( var index=0; index<data.length; index++){
			var node = data[index].cloneNode(true);
			if(!node.getAttribute('enctype')){
                
                formCount++;
				var links = node.getElementsByTagName('a');
				var link = links[0];
				var url = link.getAttribute('href');
                //console.log("CONTENT: " + link.textContent);
				link.onclick = downloadHandler(url); //create separate function for each link
				link.href = '#';
				htmlFragment.appendChild(node);
				//console.log(data[index].cloneNode());
			}

		}
		
        if(formCount > 0){
            var main = document.getElementsByClassName('gm')[0];
            main.appendChild(htmlFragment);
        }
	}
}


var downloadHandler = function(link){

	return function(){
        //console.log("OLD FILENAME: " + oldFilename);
		downloadTorrent(link);
		return false;
	}
}

//fuck does this do?
/*
function sendDownloadRequest(url, callback){

	var ret = GM_xmlhttpRequest({
	  method: "GET",
	  url: url,
      headers: {
          "Content-Type":"multipart/form-data"
      },
	  onload: function(res) {
		callback(res.responseText);
	  },
      onerror: function(res){
          console.log("Error");
          console.log(res.responseHeaders);
      }
	});
}
*/

function downloadTorrent(link){
   var rawTitle = document.getElementById('gn').textContent;
   var processedTitle = rawTitle.replace(/%/g, '%25');

    var title = encodeURIComponent(processedTitle); //check for ' in string?
    //var oldTitle = encodeURIComponent(oldtitle);
	
	//sendDownloadRequest(link, checkTorrent);
    var url = "http://" + host + ":" + localport + "/?link=" + link + "&title=" + title;
	console.log("URL: " + url);

	
    httpGetAsync(url, checkTorrent);
    console.log(link);

}


function checkTorrent(html){

    
    var imageArea = document.getElementById('gd1');
    var image = imageArea.getElementsByTagName('img');
    var img = image[0].src;
    var notificationDetails = {
    text: html,
    title: 'Downloading...',
    image: img, 
    timeout: 5000
    };
    
    GM_notification(notificationDetails);
	console.log(html);
}

function checkAdding(response){
	
	console.log(response);
}

function extractTorrentInfoFromHTML(html) {
  
  var parser = new DOMParser();
  var dummy = parser.parseFromString(html, "text/xml");
  var res = dummy.getElementById('torrentinfo');
  var torrents = res.getElementsByTagName('form');
	
  return torrents;
  
}