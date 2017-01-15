// ==UserScript==
// @name        		slader-crawler
// @namespace   		https://greasyfork.org/en/users/94062-oshaw
// @version    		    0.1.1
// @author				Oscar Shaw
// @include				*://slader.*
// @grant				GM_xmlhttpRequest
// @require				http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @run-at				document-start
// @noframes
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
function get(url, anon)      {
	
	var xhr	= new XMLHttpRequest();
	xhr.onload = function() { anon(this.responseText); };
	xhr.open("GET", url, true);
	xhr.send();
}
function gmGet(url, anon)    {
	
	GM_xmlhttpRequest({
		
		method: "GET",
		url:    url,
		onload: function(kvp) { anon(kvp.responseText); }
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
		
		url_output += (url[i] == ' ') ? "+" : url[i];
	}
	return url_output;
}

function class_sladerCrawler() {
	
	var kvp_textbook = {}
	
	function func_viewTextbookSearch() {}
	function func_viewTextbookResults() {}
	function func_viewTextbookContents() {}
	function func_viewQuestionsOnPage() {}
	function func_viewSingleSolution() {}
	function func_viewFullScreenSolution() {}
	
	function func_getTextbookResults(str_query, anon_callback) {
		
		GM_xmlhttpRequest({
			
			method: "POST",
			url: (
			
				  "https://8bbzgj41nl-dsn.algolia.net/"
				+ "1/indexes/*/queries?"
				+ "x-algolia-agent=Algolia%20for%20vanilla%20JavaScript%203.20.3"
				+ "&x-algolia-application-id=8BBZGJ41NL"
				+ "&x-algolia-api-key=ecc53b33402d31d49ed35804e2707bd6"
			),
			data: (
			
				'{"requests":[{"indexName":"textbook_index",\
				"params":"query=' + str_query + '&hitsPerPage=10&page=0"}]}'
			),
			onload: function(kvp) { anon_callback(JSON.parse(kvp.responseText)); }
		});
	}
	function func_getTextbookContents(url_textbook, anon_callback) {
		
		gmGet(url_textbook, function(html) {
			
			var jsects_chapters = (
			
				$("<div/>")
				.html(html)
				.find(".toc-item")
			);
			$.each(jsects_chapters, function(i, sect_chapter) {
				
				var jsect_chapter = $("<div/>").html(sect_chapter.innerHTML);
				var str_name = (trimSpaces(
				
					jsect_chapter
					.find(".chapter").eq(0)
					.find("h3").eq(0).text()
					
				) + ": " + trimSpaces(
				
					jsect_chapter
					.find(".chapter").eq(0)
					.find("p").eq(0).text())
					
				);
				console.log(str_name);
				$.each(jsect_chapter.find(".exercise-group"), function(j, tr) {
					
					var str_section = "\t";
					$.each(tr.childNodes, function(k, td) {
						
						if (defined(td.innerHTML)) {
							
							str_section += td.textContent + " ";
						}
					});
					console.log(str_section);
				});
			});
		});
	}
	function func_getQuestionsOnPage(url_page, anon_callback) {
		
		gmGet(url_page, function(html) {
			
			var jdivs_questions = (
			
				$("<div/>").html(html)
				.find(".list").children()
			);
			
			$.each(jdivs_questions, function(i, div_question) {
				
				var jdiv_question = (
				
					$("<div/>").html(div_question)
					.find(".answer-number").eq(0)
				);
				console.log(jdiv_question.text());
			});
		});
	}
	function func_getSingleSolution(url_solution, anon_callback) {
		
		gmGet(url_solution, function(html) {
			
			GM_xmlhttpRequest({
				
				method: "GET",
				url: "https://slader.com" + (
				
					$("<div/>").html(html)
					.find(".left").eq(0)
					.children().eq(2)
					.attr("data-url")
				),
				headers: { "X-Requested-With": "XMLHttpRequest" },
				onload: function(kvp) {
					
					var jimgs_solutions = (
					
						$("<div/>").html(kvp.responseText)
						.find(".image-large")
					);
					
					$.each(jimgs_solutions, function(i, img_solution) {
						
						console.log(img_solution.getAttribute("src"));
					});
				}
			});
		});
	}
	
	func_getTextbookSearch("stewart", function(json) {
		
		var url_textbook = (
			
			  "https://slader.com"
			+ json.results[0].hits[0].get_absolute_url
		);
		func_getTextbookContents(url_textbook);
		
		var url_page = (
			
			  "https://slader.com/textbook/"
			+ "9781285741550-stewart-calculus-early-transcendentals-8th-edition/"
			+ "33/#exercises"
		);
		func_getQuestionsOnPage(url_page);
		
		var url_solution = (

			  "https://slader.com/textbook/"
			+ "9781285741550-stewart-calculus-early-transcendentals-8th-edition/"
			+ "33/exercises/1a/#"
		);
		func_getSingleSolution(url_solution);
	});
}
function main() {
	
	window.stop();
	$("html").html("<head></head><body></body>");
	var obj_sladerCrawler = new class_sladerCrawler();
}

console.log("Compiled");
main();