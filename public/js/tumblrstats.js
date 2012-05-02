/*
 * TumblrStats
 * http://tumblrstats.com/
 *
 * Copyright (c) 2009-2010 QAD
 * Last updated: Jan 11, 2010
 *
 */

Stats = {
	username: 'quanganhdo',
	url: 'http://log.quanganhdo.com',
	begin: '',
	end: '',
	'posts-start': 0,
	'posts-num': 50,
	posts: [],
	types: {regular: 0, link: 0, quote: 0, photo: 0, conversation: 0, video: 0, audio: 0},
	freq: {},  
	delay: 5,
	delayStart: 0,
	overview: function() {        
		// get most recent post
		$.getJSON(Stats.url + 'api/read/json?callback=?', {start: 0, num: 1}, function(last) {
			Stats.username = last.tumblelog.name;
			// get very first post
			$.getJSON(Stats.url + 'api/read/json?callback=?', {start: last['posts-total'] - 1, num: 1}, function(first) {
				// update info
				$('#info').html($.sprintf('Your tumblelog (residing at <span class="important">%s</span>) is called <span class="important">%s</span> and given <span id="description">the description <span class="important">"%s"</span></span>.', Stats.url.replace(/(http:\/\/|\/)/g, ''), last.tumblelog.title, last.tumblelog.description.stripTags()));
				
				if (last.tumblelog.description == '') $('#description').html('no description');
				
				// update count
				$('#count').html($.sprintf('You have been an active tumblelogger since <span class="important">%s</span> and overall you have made the total number of <span class="important">%d</span> posts. Your last post was on <span class="important">%s</span>. That means <span class="important">%0.2f</span> posts were made per day, and in case you haven\'t noticed, your tumblelog is <span class="important">%0.2f</span> years old.', Helper.dateOnly(first.posts[0].date), last['posts-total'], Helper.dateOnly(last.posts[0].date), last['posts-total'] / Helper.dateDiff(last.posts[0]['date'], first.posts[0]['date']), Helper.dateDiff(first.posts[0]['date'], new Date()) / 365.25));
				
				$('#overview').show();
				
				Stats.begin = new Date(first.posts[0]['date']);
				Stats.end = new Date(last.posts[0]['date']);
				
				// boring stuff
				$('#annoyance').show();
				$('#countdown').val(Stats.delay);
				Stats.delayStart = Date.parse(new Date()) / 1000;
				Stats.slowFetch();
			});
		});
	},
	slowFetch: function() {
	    var now = Date.parse(new Date()) / 1000;
        var minutesToMidnight = parseInt(Stats.delay - (now - Stats.delayStart), 10);
        Helper.updateCount('countdown', minutesToMidnight);
        if (minutesToMidnight > 0) {
            setTimeout('Stats.slowFetch()', 100);
        } else {
            Stats.fetch();
        }
	}, 
	fetch: function() {
		$.getJSON(Stats.url + 'api/read/json?callback=?', {start: Stats['posts-start'], num: Stats['posts-num']}, function(data) {
			// build DB
			$.each(data.posts, function(i, item) {
				Stats.posts.push(item);
				Stats.types[item.type]++;
			});

			// update 
			$('#post-types').show();
			Helper.updateCount('post-types-status', Stats.posts.length);
			$.each(Stats.types, function(type, count) {
				Helper.updateCount(type + '-count', count);
			});
			
			if (data['posts-total'] > (data['posts-start'] + Stats['posts-num'])) {
				// fetch more if needed
				Stats['posts-start'] = data['posts-start'] + Stats['posts-num'];
				Stats['posts-num'] = Math.min(Stats['posts-num'], data['posts-total'] - Stats['posts-start']);
				             
				// boring stuff
				$('#annoyance').show();
				$('#countdown').val(Stats.delay);
				Stats.delayStart = Date.parse(new Date()) / 1000;
				Stats.slowFetch();
			} else {
				// done fetching                     
				$('#post-types-load, #annoyance').hide();
				$('#post-types-by-chart').html($.sprintf('<img src="%s" />', 'http://chart.apis.google.com/chart?chs=400x200&cht=p&chl=Regular|Link|Quote|Photo|Conversation|Video|Audio&chd=t:' + [Stats.types.regular, Stats.types.link, Stats.types.quote, Stats.types.photo, Stats.types.conversation, Stats.types.video, Stats.types.audio].join(',') + '&chds=0,' + [Stats.types.regular, Stats.types.link, Stats.types.quote, Stats.types.photo, Stats.types.conversation, Stats.types.video, Stats.types.audio].sum() + '&chco=' + Helper.kuler.join(',')));
				$('#post-types-by-number').addClass('legend');

				Stats.calculateFrequency();
			}
		});
	},
	calculateFrequency: function() {
		// init
		var yearStart = Stats.begin.getFullYear();
		var yearEnd = Stats.end.getFullYear();
		for (var i = yearStart; i <= yearEnd; i++) {
			Stats.freq[i] = [];
			for (var j = 0; j < 12; j++) {
				Stats.freq[i].push(j);
				Stats.freq[i][j] = 0;
			}
		}
		
		// calculate
		$.each(Stats.posts, function(i, item) {
			var datePosted = new Date(item.date);
			Stats.freq[datePosted.getFullYear()][datePosted.getMonth()]++;
		});
		
		// sparkline
		var markers = [];
		var flattened_freq = [0];
		var monthStart = Stats.begin.getMonth();
		var monthEnd = Stats.end.getMonth();
		for (var i = yearStart; i <= yearEnd; i++) {
			markers.push($.sprintf('t%d,%s,0,%d,10', i, '000000', flattened_freq.length));
			for (var j = 0; j < 12; j++) {
				if ((i == yearStart && j < monthStart) || (i == yearEnd && j > monthEnd)) {
					// out of range
				} else {
					flattened_freq.push(Stats.freq[i][j]);
				}
			}
		}
		flattened_freq.push(0);
		
		$('#posting-frequency-chart').html($.sprintf('<img src="%s" />', 'http://chart.apis.google.com/chart?chs=600x60&cht=ls&chd=t:' + flattened_freq.join(',') + '&chds=0,' + flattened_freq.sum() + '&chm=' + markers.join('|') + '&chco=' + Helper.kuler[0]));
		$('#posting-frequency').show();
		
		// peak time
		var peak = Math.max.apply(Math, flattened_freq);
		$('#peak').html($.sprintf('At peak time, you made <span class="important">%d</span> posts in one month — that\'s <span class="important">%0.2f</span> posts per day.', peak, peak / 30));
		
		// done
		$('#loading').html($.sprintf('<a href="/%s">Permalink</a> &middot; <a href="/">Try someone else?</a>', Stats.username));
	}
};

Helper = {
	kuler: ['468966', 'FFF0A5', 'FFB03B', 'B64926', '999999'],
	dateDiff: function(d1, d2) {
		var d1 = new Date(d1).getTime();
		var d2 = new Date(d2).getTime();
		return Math.abs(d1 - d2) / 86400000;
	},
	dateOnly: function(d) {
		return d.replace(/ [0-9]{2}:[0-9]{2}:[0-9]{2}/, '');
	},
	updateCount: function(id, val) {
		if ($('#' + id).text() != val) Fat.fade_element(id, 30, 1000, '#FFFF33', '#FFFFFF');
 		$('#' + id).text(val);
	}
};

String.prototype.stripTags = function() {
	return this.replace(/<("[^"]*"|'[^']*'|[^'">])*>/gi, "");
};

//+ Carlos R. L. Rodrigues
//@ http://jsfromhell.com/array/sum [rev. #1]
Array.prototype.sum = function(){
    for(var s = 0, i = this.length; i; s += this[--i]);
    return s;
};