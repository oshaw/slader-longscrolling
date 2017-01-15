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
	
	var kvp_model    = {
		
		str_query: "",
		textbooks:
		[
			{
				chapters: [
					{
						sections: [
							{
								questions: [
									{
										solutions: []
									}
								]
							}
						]
					}
				]
			}
		]
	}
	var url_base     = "http://slader.com";
	var int_textbook = 0;
	var int_chapter  = 0;
	var int_section  = 0;
	var int_question = 0;
	
	function func_viewTextbookSearch() {}
	function func_viewTextbookResults() {}
	function func_viewTextbookContents() {}
	function func_viewQuestionsOnPage() {}
	function func_viewSingleSolution() {}
	function func_viewFullScreenSolution() {}
	
	function func_getTextbookResults(str_query, anon_callback) {
		
		kvp_model.str_query = str_query;
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
				"params":"query=' + str_query + '&hitsPerPage=5&page=0"}]}'
			),
			onload: function(kvp) {
				
				var kvps_results = JSON.parse(kvp.responseText).results[0].hits;
				
				$.each(kvps_results, function(i, kvp_result) {
					
					kvp_model.textbooks.push({
						
						str_name:      kvp_result.title,
						str_edition:   kvp_result.edition,
						str_author:    kvp_result.authors_string,
						int_isbn:      kvp_result.isbn,
						url_thumbnail: kvp_result.search_thumbnail_large,
						url_path:      kvp_result.get_absolute_url,
						chapters:      []
					});
				});
				anon_callback();
			}
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
				kvp_model.textbooks[int_textbook].chapters.push({
					
					str_number: i + 1,
					str_name: trimSpaces(
					
						jsect_chapter
						.find(".chapter").eq(0)
						.find("p").eq(0).text()
					),
					sections: []
				});
				
				$.each(jsect_chapter.find(".exercise-group"), function(j, tr) {
					
					kvp_model.textbooks[int_textbook].chapters[i].sections
						.push({ questions: [] });
					
					kvp_model.textbooks[int_textbook].chapters[i].sections[j]
						.url_pageStart = url_base + tr.getAttribute("data-url");
					
					var jtr = $("<div/>").html(tr.innerHTML);
					$.each(jtr.find("td"), function(k, td) {
						
						switch (k) {
							
							case 0: {
								
								kvp_model.textbooks[int_textbook]
									.chapters[i].sections[j]
									.str_number = trimSpaces(td.textContent);
									
								break;
							}
							case 1: {
								
								if (defined(trimSpaces(td.textContent))) {
									
									kvp_model.textbooks[int_textbook]
										.chapters[i].sections[j]
										.str_name = trimSpaces(td.textContent);
								}
								break;
							}
							case 2: {
								
								if (!defined(kvp_model.textbooks[int_textbook]
									.chapters[i].sections[j]
									.str_name)) {
									
									kvp_model.textbooks[int_textbook]
										.chapters[i].sections[j]
										.str_name = trimSpaces(td.textContent);
								}
								break;
							}
							case 3: {
								
								kvp_model.textbooks[int_textbook]
									.chapters[i].sections[j]
									.int_pageStart = parseInt(
									
									td.textContent.substring(2)
								);
								break;
							}
							default: break;
						}
					});
				});
			});
			anon_callback();
		});
	}
	function func_getQuestionsOnPage(url_page, anon_callback) {
		
		gmGet(url_page, function(html) {
			
			var jdivs_questions = $("<div/>").html(html).find(".list").children();
			
			$.each(jdivs_questions, function(i, div_question) {
				
				if (i == 0) return;
				var jdiv_question = $("<div/>").html(div_question);
				
				kvp_model.textbooks[int_textbook].chapters[int_chapter]
					.sections[int_section].questions.push({
					
					str_number:  jdiv_question.find(".answer-number").eq(0).text(),
					html_answer: jdiv_question.find(".answer").eq(0).html(),
					solutions:   []
				});
			});
			anon_callback();
		});
	}
	function func_getSingleSolution(url_solution, anon_callback) {
		
		gmGet(url_solution, function(html) {
			
			GM_xmlhttpRequest({
				
				method: "GET",
				url: "https://slader.com" + (
				
					$("<div/>").html(html).find(".left").eq(0)
					.children().eq(2).attr("data-url")
				),
				headers: { "X-Requested-With": "XMLHttpRequest" },
				onload: function(kvp) {
					
					var jartcs_solutions = (
					
						$("<div/>").html(kvp.responseText)
						.find("article")
					);
					
					$.each(jartcs_solutions, function(i, artc_solution) {
						
						kvp_model.textbooks[int_textbook].chapters[int_chapter]
							.sections[int_section].questions[int_question]
							.solutions.push({ steps: [] });
							
						var jartc_solution = $("<div/>").html(artc_solution);
						var jdivs_steps = (
						
							jartc_solution.find(".solution-row.explanation-row")
						);
						
						$.each(jdivs_steps, function(j, div_step) {
							
							kvp_model.textbooks[int_textbook]
								.chapters[int_chapter].sections[int_section]
								.questions[int_question].solutions[i]
								.steps.push({ html_work: "" });
							
							var jdivs_cells = (
								
								$("<div/>").html(div_step)
								.find(".solution-content")
							);
							
							$.each(jdivs_cells, function(k, div_cell) {
								
								var jlmts = (
									
									$("<div/>").html(div_cell)
									.children().eq(0).children()
								);
								
								$.each(jlmts, function(l, lmt) {
									
									var jlmt = $("<div/>").html(lmt);
									
									if (lmt.style.display != "none") {
										
										if (kvp_model.textbooks[int_textbook]
											.chapters[int_chapter]
											.sections[int_section]
											.questions[int_question]
											.solutions[i].steps[j]
											.html_work == "") {
											
											kvp_model.textbooks[int_textbook]
												.chapters[int_chapter]
												.sections[int_section]
												.questions[int_question]
												.solutions[i].steps[j]
												.html_work = lmt.src;
										}
										else {
											
											kvp_model.textbooks[int_textbook]
												.chapters[int_chapter]
												.sections[int_section]
												.questions[int_question]
												.solutions[i].steps[j]
												.html_explanation = lmt.src;
										}
									}
								});
							});
						});
					});
					anon_callback();
				}
			});
		});
	}
	
	var url = (
	
		  "https://slader.com/textbook/"
		+ "9781285741550-stewart-calculus-early-transcendentals-8th-edition/"
		+ "19/exercises/2/"
	);
	
	func_getSingleSolution(url, function() {
		
		console.log(kvp_model);
	});
	
	/* func_getTextbookSearch("stewart", function(json) {
		
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
	}); */
}
function main() {
	
	//window.stop();
	//$("html").html("<head></head><body></body>");
	var obj_sladerCrawler = new class_sladerCrawler();
}

console.log("Compiled");
main();