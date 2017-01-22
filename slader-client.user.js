// ==UserScript==
// @name        		slader-client
// @namespace   		https://greasyfork.org/en/users/94062-oshaw
// @version    		    0.2.5
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
function clearBody()	 {
	
	window.stop();
	$("body").html("");
}

function class_sladerCrawler() {
	
	var kvp_model    = {}
	var url_base     = "http://slader.com";
	var int_textbook = -1;
	var int_chapter  = -1;
	var int_section  = -1;
	var int_question = -1;
	
	function func_dirToHeader(url) {
		
		if (url.indexOf("#concept-check") != -1) {
			
			return "Review: Concept Check";
		}
		else if (url.indexOf("#review-exercises") != -1) {
			
			return "Exercises";
		}
		else if (url.indexOf("#review-true-false-quiz") != -1) {
			
			return "Review: True-False Quiz";
		}
		else if (url.indexOf("#problems-plus") != -1) {
			
			return "Problems Plus";
		}
		else return "Exercises";
	}
	
	function model_getTextbookResults(str_query) {
		
		if (!defined(str_query)) return;
		
		kvp_model = {
			
			str_query: str_query,
			textbooks: []
		}
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
						str_isbn:      kvp_result.isbn,
						url_thumbnail: kvp_result.search_thumbnail_large,
						url_path:      kvp_result.get_absolute_url,
						chapters:      []
					});
				});
				view_textbookResults();
			}
		});
	}
	function model_getTextbookContents(int_textbookIndex) {
		
		int_textbook = int_textbookIndex;
		gmGet(kvp_model.textbooks[int_textbook].url_path, function(html) {
			
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
			view_textbookContents();
		});
	}
	function model_getQuestionsInSection(int_chapterIndex, int_sectionIndex) {
		
		int_chapter = int_chapterIndex;
		int_section = int_sectionIndex;
		
		{ var int_page = (
			
			kvp_model.textbooks[int_textbook].chapters[int_chapter]
			.sections[int_section].int_pageStart
			
		); }
		{ var url = kvp_model.textbooks[int_textbook].url_path + int_page; }
		{ var str_header = func_dirToHeader(
			
			kvp_model.textbooks[int_textbook].chapters[int_chapter]
			.sections[int_section].url_pageStart
		); }
		
		var anon_loopThroughPages = function() {
			
			model_getQuestionsOnPage(
			
				url_base + kvp_model.textbooks[int_textbook].url_path + int_page,
				str_header,
				function(int_next) {
					
					int_page = int_page + 1;
					if (int_page == int_next) anon_loopThroughPages();
				}
			);
		}
		view_questionListHeader();
		anon_loopThroughPages();
	}
	function model_getQuestionsOnPage(url, str_header, anon_callback) {
		
		gmGet(url, function(html) {
			
			var jdivs_questions = $("<div/>").html(html).find(".list").children();
			var bool_inSection = false;
			
			$.each(jdivs_questions, function(i, div_question) {
				
				var bool_isHeader = false;
				if (div_question.tagName == "H3") {
					
					bool_isHeader = true;
					if (div_question.textContent == str_header) {
						
						bool_inSection = true;
					}
					else bool_inSection = false;
				}
				if (bool_inSection && !bool_isHeader) {
					
					var jdiv_question = $("<div/>").html(div_question);
					var str_number = jdiv_question.find(".answer-number").eq(0).text();
					str_number = str_number.substring(0, str_number.indexOf('.'));
					
					var url_solutions = div_question.getAttribute("data-url");
					var kvp_question = ({
						
						str_number:    str_number,
						url_solutions: url_base + url_solutions,
						solutions:     []
					});
					
					var jp_answer = (jdiv_question.find(".answer").eq(0));
					
					$.each(jp_answer.children(), function(j, lmt) {
						
						if (lmt.tagName == "IMG") {
							
							if (lmt.src.indexOf("large") != -1) {
								
								kvp_question.url_imgAnswer = lmt.src;
							}
						}
					});
					
					if (!defined(kvp_question.url_imgAnswer)) {
						
						kvp_question.str_answer = trimSpaces(jp_answer.text());
					}
					
					kvp_model.textbooks[int_textbook].chapters[int_chapter]
						.sections[int_section].questions.push(kvp_question);
				}
			});
			
			view_updateSectionQuestions();
			anon_callback(parseInt($("<div/>").html(html).find(".next").eq(0).text()));
		});
	}
	function model_getSolutions(int_questionIndex) {
		
		int_question = int_questionIndex;
		
		var url_solution = (
		
			kvp_model.textbooks[int_textbook].chapters[int_chapter]
			.sections[int_section].questions[int_question].url_solutions
		);
		
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
								.steps.push({
									
									url_imgWork:        "",
									str_work:           "",
									url_imgExplanation: "",
									str_explanation:    ""
								});
							
							var jdivs_cells = (
								
								$("<div/>").html(div_step)
								.find(".solution-content")
							);
							
							$.each(jdivs_cells, function(k, div_cell) {
								
								var jlmts = (
									
									$("<div/>").html(div_cell)
									.children().eq(0).children()
								);
								
								var kvp_step = (
								
									kvp_model.textbooks[int_textbook]
									.chapters[int_chapter]
									.sections[int_section]
									.questions[int_question]
									.solutions[i].steps[j]
								);
								
								$.each(jlmts, function(l, lmt) {
									
									switch (lmt.tagName) {
										
										case "IMG": {
											
											if (lmt.src.indexOf("large") == -1) break;
											
											if (!defined(kvp_step.url_imgWork) && !defined(kvp_step.p_work)) {
												
												kvp_step.url_imgWork = lmt.src;
											}
											else kvp_step.url_imgExplanation = lmt.src;
											
											break;
										}
										case "P": {
											
											if (lmt.classList.contains("center")) break;
											
											if (!defined(kvp_step.url_imgWork) && !defined(kvp_step.p_work)) {
												
												kvp_step.str_work = trimSpaces(lmt.textContent);
											}
											else kvp_step.str_explanation = trimSpaces(lmt.textContent);
											
											break;
										}
										case "A": {
											
											if (!defined(kvp_step.url_imgWork) && !defined(kvp_step.p_work)) {
												
												kvp_step.url_imgWork = lmt.getElementsByTagName("IMG")[0].src;
											}
											else kvp_step.url_imgExplanation = lmt.getElementsByTagName("IMG")[0].src;
											
											break;
										}
										default: break;
									}
								});
							});
						});
						
						var jlmts_answerElements = (
						
							jartc_solution
							.find(".solution-row.result-row").eq(0)
							.find(".solution-content").eq(0).children()
						);
						var kvp_solution = (
						
							kvp_model.textbooks[int_textbook]
							.chapters[int_chapter].sections[int_section]
							.questions[int_question].solutions[i]
						);
						
						$.each(jlmts_answerElements, function(j, lmt) {
							
							switch (lmt.tagName) {
								
								case "IMG": {
									
									if (lmt.src.indexOf("large") == -1) break;
									kvp_solution.url_imgAnswer = lmt.src;
									break;
								}
								case "P": {
									
									kvp_solution.str_answer = trimSpaces(lmt.textContent);
									break;
								}
								default: break;
							}
						});
					});
					view_solutions();
				}
			});
		});
	}
	
	function view_textbookSearch() {
		
		clearBody();
		document.title = "Slader Crawler";
		
		var anon = function() { model_getTextbookResults($("#intext").val()); };
		
		{ $("body").append(
			
			  '<input id="intext" type="text"></input>'
			+ '<input id="insub" type="submit"></input'
		); }
		$("#intext").focus();
		$("#insub").click(anon);
		
		$("#insub").css("cursor", "pointer");
		$(document).keypress(function(int_keycode) {
			
			if (int_keycode.which == 13 && $("#intext").is(':focus')) anon();
		});
	}
	function view_textbookResults() {
		
		clearBody();
		document.title = "\"" + kvp_model.str_query + "\"";
		
		var anon = function() { model_getTextbookResults($("#intext").val()); };
		
		{ $("body").append(
			
			  '<input id="intext" type="text"></input>'
			+ '<input id="insub" type="submit"></input'
		); }
		$("#intext").focus();
		$("#intext").val(kvp_model.str_query);
		$("#insub").click(anon);
		$("#insub").css("cursor", "pointer");
		
		$(document).keypress(function(int_keycode) {
			
			if (int_keycode.which == 13 && $("#intext").is(':focus')) anon();
		});
		
		$.each(kvp_model.textbooks, function(i, kvp_textbook) {
			
			var anon = function() { model_getTextbookContents(i); }
			{ $("body").append(
				
				  '<div class="div_textbook">'
				+     '<div class="div_column">'
				+         '<img src="' + kvp_textbook.url_thumbnail + '">'
				+     '</div>'
				+     '<div class="div_column">'
				+         '<p>' + kvp_textbook.str_name + '</p>'
				+         '<p>' + kvp_textbook.str_edition + '</p>'
				+         '<p>' + kvp_textbook.str_isbn + '</p>'
				+     '</div>'
				+ '</div>'
				
			); }
			$(".div_textbook").eq(i).click(anon);
			$(".div_textbook").css("cursor", "pointer");
		});
	}
	function view_textbookContents() {
		
		clearBody();
		document.title = kvp_model.textbooks[int_textbook].str_name;
		
		$.each(kvp_model.textbooks[int_textbook].chapters, function(i, kvp_chapter) {
			
			{ $("body").append(
				
				  '<div class="div_chapter">'
				+     '<div class="div_column">'
				+         '<p>' + kvp_chapter.str_number + '</p>'
				+     '</div>'
				+     '<div class="div_column">'
				+         '<p>' + kvp_chapter.str_name + '</p>'
				+     '</div>'
				+ '</div>'
				
			); }
			
			$.each(kvp_chapter.sections, function(j, kvp_section) {
				
				var div_section = document.createElement("div");
				div_section.style.cursor = "pointer";
				div_section.onclick = function() {
						
						model_getQuestionsInSection(i, j);
					};
				{ div_section.innerHTML += (
					
					  '<div class="div_column">'
					+     '<p>' + kvp_section.str_number + '</p>'
					+ '</div>'
					+ '<div class="div_column">'
					+     '<p>' + kvp_section.str_name + '</p>'
					+ '</div>'
					
				); }
				document.body.appendChild(div_section);
			});
		});
	}
	function view_questionListHeader() {
		
		clearBody();
		{ document.title = ("Section " + 
			
			kvp_model.textbooks[int_textbook].chapters[int_chapter]
			.sections[int_section].str_number
			
		); }
	}
	function view_updateSectionQuestions() {
		
		{ var kvps_questions = (
		
			kvp_model.textbooks[int_textbook].chapters[int_chapter]
			.sections[int_section].questions
		); }
		for (var i = $(".div_question").length; i < kvps_questions.length; i++) {
			
			var kvp_question = kvps_questions[i];
			var div_question = document.createElement("div");
			
			div_question.className    = "div_question";
			div_question.id			  = i;
			div_question.style.cursor = "pointer";
			div_question.onclick      = function() { model_getSolutions(this.id); }
			{ div_question.innerHTML += (
				
				  '<div class="div_column">'
				+     '<p>' + kvp_question.str_number + '</p>'
				+ '</div>'
				+ '<div class="div_column"></div>'
				
			); }
			
			document.body.appendChild(div_question);
			{ div_question.getElementsByClassName("div_column")[1].innerHTML += (
				
				(defined(kvp_question.str_answer))
				? '<p>' + kvp_question.str_answer + '</p>'
				: '<img src=' + kvp_question.url_imgAnswer + '>'
			); }
		}
	}
	function view_solutions() {
		
		clearBody();
		document.title = (
		
			"Section " 
			+ kvp_model.textbooks[int_textbook].chapters[int_chapter]
			.sections[int_section].str_number
			+ " Question "
			+ kvp_model.textbooks[int_textbook].chapters[int_chapter]
			.sections[int_section].questions[int_question].str_number
		);
		
		var kvps_solutions = (
			
			kvp_model.textbooks[int_textbook].chapters[int_chapter]
			.sections[int_section].questions[int_question].solutions
		);
		
		$.each(kvps_solutions, function(i, kvp_solution) {
			
			var div_solution = document.createElement("div");
			
			$.each(kvp_solution.steps, function(j, kvp_step) {
				
				var div_step = document.createElement("div");
				
				if (defined(kvp_step.str_work)) {
					
					var p_work = document.createElement("p");
					p_work.textContent = kvp_step.str_work;
					div_step.appendChild(p_work);
				}
				else {
					
					var img_work = document.createElement("img");
					img_work.src = kvp_step.url_imgWork;
					div_step.appendChild(img_work);
				}
				
				if (defined(kvp_step.str_explanation)) {
					
					var p_explanation = document.createElement("p");
					p_explanation.textContent = kvp_step.str_explanation;
					div_step.appendChild(p_explanation);
				}
				else {
					
					var img_explanation = document.createElement("img");
					img_explanation.src = kvp_step.url_imgExplanation;
					div_step.appendChild(img_explanation);
				}
				
				div_solution.appendChild(div_step);
			});
			
			document.body.appendChild(div_solution);
			
			if (defined(kvp_solution.str_answer)) {
				
				var p_answer = document.createElement("p");
				p_answer.textContent = kvp_solution.str_answer;
				document.body.appendChild(p_answer);
			}
			else {
				
				var img_answer = document.createElement("img");
				img_answer.src = kvp_solution.url_imgAnswer;
				document.body.appendChild(img_answer);
			}
		});
	}
	
	{ $("head").html("<style>\
		\
		* { margin: 0px; }\
		.div_column {\
			\
			display: inline-block;\
			margin-right: 10px;\
		}\
		\
	</style>"); }
	view_textbookSearch();
}
function main() {
	
	window.stop();
	$("html").html("<head></head><body></body>");
	var obj_sladerCrawler = new class_sladerCrawler();
}

console.log("Compiled");
main();
