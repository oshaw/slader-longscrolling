// ==UserScript==
// @name        		slader-crawler
// @namespace   		https://greasyfork.org/en/users/94062-oshaw
// @version    		    0.2.2
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
function clearDocument()	 {
	
	window.stop();
	$("html").html("<head></head><body></body>");
}

function class_sladerCrawler() {
	
	var kvp_model    = {}
	var url_base     = "http://slader.com";
	var int_textbook = 0;
	var int_chapter  = 0;
	var int_section  = 0;
	var int_question = 0;
	
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
		
		var int_page = (
			
			kvp_model.textbooks[int_textbook].chapters[int_chapter]
			.sections[int_section].int_pageStart
		);
		var url = kvp_model.textbooks[int_textbook].url_path + int_page;
		var str_header = func_dirToHeader(
			
			kvp_model.textbooks[int_textbook].chapters[int_chapter]
			.sections[int_section].url_pageStart
		);
		
		var anon_callback = function(int_next) {
			
			int_page = int_page + 1;
			if (int_page == int_next) anon_loopThroughPages();
			else view_sectionQuestions();
		}
		var anon_loopThroughPages = function() {
			
			model_getQuestionsOnPage(
			
				url_base + kvp_model.textbooks[int_textbook].url_path + int_page,
				str_header,
				function(int_next) { anon_callback(int_next) }
			);
		}
		
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
					
					kvp_model.textbooks[int_textbook].chapters[int_chapter]
						.sections[int_section].questions.push({
						
						str_number:  jdiv_question.find(".answer-number").eq(0).text(),
						html_answer: jdiv_question.find(".answer").eq(0).html(),
						solutions:   []
					});
				}
			});
			
			anon_callback(parseInt($("<div/>").html(html).find(".next").eq(0).text()));
		});
	}
	function model_getSingleSolution(int_questionIndex) {
		
		int_question = int_questionIndex;
		
		var url_solution = (
		
			kvp_model.textbooks[int_textbook].chapters[int_chapter]
			.sections[int_section].url_pageStart
			+
			"/"
			+
			kvp_model.textbooks[int_textbook].chapters[int_chapter]
			.sections[int_section].questions[int_question].str_number
		);
		console.log(url_solution);
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
					view_singleSolution();
				}
			});
		});
	}
	
	function view_textbookSearch() {
		
		clearDocument();
		
		var inText_search = document.createElement("input"); {
			
			inText_search.type = "text";
		}
		var inSub = document.createElement("input"); {
			
			inSub.type = "submit";
		}
		
		inSub.onclick = function() { model_getTextbookResults(inText_search.value); }
		
		document.body.appendChild(inText_search);
		document.body.appendChild(inSub);
	}
	function view_textbookResults() {
		
		clearDocument();
		
		$.each(kvp_model.textbooks, function(i, kvp_textbook) {
			
			var div = document.createElement("div");
			var p_name = document.createElement("p"); {
				
				p_name.textContent = kvp_textbook.str_name;
			}
			var p_edition = document.createElement("p"); {
				
				p_edition.textContent = kvp_textbook.str_edition;
			}
			var p_isbn = document.createElement("p"); {
				
				p_isbn.textContent = kvp_textbook.str_isbn;
			}
			var img_thumbnail = document.createElement("img"); {
				
				img_thumbnail.src = kvp_textbook.url_thumbnail;
			}
			
			div.onclick = function() { model_getTextbookContents(i); }
			
			div.appendChild(p_name);
			div.appendChild(p_edition);
			div.appendChild(p_isbn);
			div.appendChild(img_thumbnail);
			document.body.appendChild(div);
		});
	}
	function view_textbookContents() {
		
		clearDocument();
		
		$.each(kvp_model.textbooks[int_textbook].chapters, function(i, kvp_chapter) {
			
			var div_chapter = document.createElement("div");
			var p_chapterNumber = document.createElement("p"); {
				
				p_chapterNumber.textContent = kvp_chapter.str_number;
			}
			var p_chapterName = document.createElement("p"); {
				
				p_chapterName.style.fontWeight = "bold";
				p_chapterName.textContent = kvp_chapter.str_name;
			}
			
			div_chapter.appendChild(p_chapterNumber);
			div_chapter.appendChild(p_chapterName);
			document.body.appendChild(div_chapter);
			
			$.each(kvp_chapter.sections, function(j, kvp_section) {
				
				var div_section = document.createElement("div");
				var p_sectionNumber = document.createElement("p"); {
					
					p_sectionNumber.textContent = kvp_section.str_number;
				}
				var p_sectionName = document.createElement("p"); {
					
					p_sectionName.textContent = kvp_section.str_name;
				}
				
				div_section.onclick = function() { model_getQuestionsInSection(i, j); }
				
				div_section.appendChild(p_sectionNumber);
				div_section.appendChild(p_sectionName);
				document.body.appendChild(div_section);
			});
		});
	}
	function view_sectionQuestions() {
		
		clearDocument();
		
		var kvps_questions = (
		
			kvp_model.textbooks[int_textbook].chapters[int_chapter]
			.sections[int_section].questions
		);
		
		$.each(kvps_questions, function(i, kvp_question) {
			
			var div = document.createElement("div");
			var p_number = document.createElement("p"); {
				
				p_number.textContent = kvp_question.str_number;
			}
			var div_answer = document.createElement("div"); {
				
				div_answer.innerHTML = kvp_question.html_answer;
			}
			
			div.onclick = function() { model_getSingleSolution(i) }
			
			div.appendChild(p_number);
			div.appendChild(div_answer);
			document.body.appendChild(div);
		});
	}
	function view_singleSolution() {}
	
	view_textbookSearch();
}
function main() {
	
	clearDocument();
	var obj_sladerCrawler = new class_sladerCrawler();
}

console.log("Compiled");
main();