
/**
 * Declines meetings on a chosen 'focus day' in the upcoming work week if RSVP already not set
 */
function autoDeclineMeetingsDuring() {
  var focusDay = 4; //Thursday, counts from 0 -6, 0 = Sunday
  var declineMessage = "Auto-declined because Focus Thursday. Please reschedule :)";
  var minResponseNotice = 1; //Meetings must be at least these many days away from current time to be declined
  var maxResponseNotice = 7 * 100; //minResponseNotice must be smaller than these, significantly smaller, preferably < 7
  
  function getNextFocusDay() {
    var today = new Date();
    var nearestFocusDay = today;
    
    var offset = (focusDay - minResponseNotice + maxResponseNotice)%7;
    var addDaysFactor = minResponseNotice + 6 - ((today.getDay() + 6 - offset)%7);
    
    //JS should update month, year etc
    nearestFocusDay.setDate(today.getDate() + addDaysFactor);
    nearestFocusDay.setHours(0);
    nearestFocusDay.setMinutes(0);
    nearestFocusDay.setSeconds(0);
    nearestFocusDay.setMilliseconds(0);
 
    var nearestAfterFocusDay = new Date(nearestFocusDay);
    nearestAfterFocusDay.setDate(nearestAfterFocusDay.getDate() + 1);
    return {focusStart: nearestFocusDay, focusEnd: nearestAfterFocusDay};
  }
  
  var focusDay = getNextFocusDay();
  //Logger.log("%s, %s", focusDay.focusStart, focusDay.focusEnd);
  
  var calendarId = 'primary';
  var optionalArgs = {
    timeMin: focusDay.focusStart.toISOString(),
    timeMax: focusDay.focusEnd.toISOString(),
    showDeleted: false,
    singleEvents: true,
    orderBy: 'startTime'
  };
  var response = Calendar.Events.list(calendarId, optionalArgs);
  var events = response.items;
  if (events.length > 0) {
    for (i = 0; i < events.length; i++) {
      var event = events[i];
      var when = event.start.dateTime;
      if (!when) {
        when = event.start.date;
      }
      //Logger.log("%s", event);
      
      if( event.attendees ) {
        for(j = 0; j < event.attendees.length; j++) {
          var attendee = event.attendees[j];
          if( attendee.self && attendee.responseStatus === "needsAction" ) {
            attendee.comment = declineMessage;
            attendee.responseStatus = "declined";
            event.attendees[j] = attendee
          } 
        }
        try {
          event = Calendar.Events.update(
            event,
            calendarId,
            event.id,
            {},
            {'If-Match': event.etag}
          );
          Logger.log('Successfully declined event: [%s, %s]', event.id, event.summary);
        } catch (e) {
          Logger.log('Failed to decline event with exception: ' + e);
        }
      }
      
    }
  } else {
    Logger.log('No events found on next Focus day [%s, %s]', focusDay.focusStart, focusDay.focusEnd);
  }
}
