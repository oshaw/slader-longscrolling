// ==UserScript==
// @name        		slader-crawler
// @namespace   		https://greasyfork.org/en/users/94062-oshaw
// @version    		    0
// @author				Oscar Shaw
// @include				*.slader.com/*
// @grant				GM_xmlhttpRequest
// @require				http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @run-at				document-start
// ==/UserScript==

function tag(str_tag)        {
	
	switch (str_tag[0]) {
		
		case '.': return document.getElementsByClassName(str_tag.substring(1));
		case '#': return document.getElementById(str_tag.substring(1));
		default:  return document.getElementsByTagName(str_tag);
	}
}
function view(str)           {
	
	window.open().document.body
	.appendChild(document.createElement('pre')).innerHTML
		= str;
}
function attempt(anon)       {
	
	try {
		
		anon();
	}
	catch(str_error) {
		
		console.log(str_error);
	}
}
function defined(var_input)  {
	
	return !(var_input == null || var_input == undefined || var_input == "");
}
function numeric(char_input) {
	
	return ("1234567890".indexOf(char_input) != -1); 
}
function request(url, anon)  {
	
	console.log("Requesting " + url);
	
	var xhr	= new XMLHttpRequest();
	xhr.onload = function() { anon(this.responseText); };
	xhr.open("GET", url, true);
	xhr.send();
}
function gmRequest(url_input, anon) {
	
	GM_xmlhttpRequest({
		
		method: "GET",
		url:    url_input,
		onload: function(kvp) {
			
			anon(kvp.response);
		}
	});
}
function trimSpaces(str)     {
	
	var int_start = 0;
	var int_end = str.length - 1;
	
	for (var i = 0; i < str.length; i++) { 
	
		if (str[i] != ' ' && str[i] != "\n") { 
		
			int_start = i;
			break;
		}
	}
	for (var i = str.length-1; i >= 0; i--) {
		
		if (str[i] != ' ' && str[i] != "\n") {
			
			int_end = i;
			break;
		}
	}
	
	return str.substring(int_start, int_end+1);
}
function urlEncode(url)      {
	
	var url_output = "";
	for (var i=0; i < url.length; i++) {
		
		url_output += (url[i] == ' ') ? '+' : url[i];
	}
	return url_output;
}

// http://www.slader.com/search/?include=textbook_index&search_query=stewart

function func_textbookSearch(str_query, anon_callback) {
	
	{ var url = urlEncode(
		
		"http://www.slader.com/search/?include=textbook_index&search_query="
		+ str_query
	); }
	
	gmRequest(url, function(html_results) {
		
		
	});
}

console.log("Compiled");
func_textbookSearch("stewart");
















