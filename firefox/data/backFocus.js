/**
 * Created by hank on 3/6/2015.
 */
self.port.on("backFocus", function (msg) {
    var activeDom = document.querySelectorAll('[langToolActive="1"]');
    if (activeDom.length !== 0) {
        activeDom[0].focus();
        activeDom.removeAttribute("langToolActive");
    }
});