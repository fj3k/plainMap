enum Method {
    Get = 'GET',
    Post = 'POST',
    Put = 'PUT'
}

enum Status {
    Connection = 0,
    ReadyState = 1,
    Status = 2
}

type SuccessHandler = (response: string) => void;
type FailureHandler = (status: number, xhrStatus: number, error: string) => void;
type ProgressHandler = (percent: number) => void;
type Headers = {[index: string]: string};

export function doRequest(method: Method, url: string, post: any, handleSuccess: SuccessHandler, handleFailure: FailureHandler, headers: Headers = {}, progressUpdate: ProgressHandler | null = null, useCache: boolean = false) {
    var xhr = getXHR(handleFailure);
    if (!xhr) return;

    xhr.onreadystatechange = function() {
        if(xhr.readyState  == 4) {
            if(xhr.status  == 200) {
                handleSuccess(xhr.responseText);
            } else {
                handleFailure(Status.Status, xhr.status, "Status: " + xhr.status);
            }
        } else {
            handleFailure(Status.ReadyState, xhr.readyState, "Ready State: " + xhr.readyState + '\n' + "Response Text: " + xhr.responseText);
        }
    };
    try {
        if (progressUpdate) {
            xhr.upload.addEventListener('progress', function(e: ProgressEvent) {
                progressUpdate(Math.ceil(e.loaded / e.total) * 100);
            }, false);
        }

        xhr.open(method, url,  true);

        if (!useCache && !post) {
            xhr.setRequestHeader("Pragma", "no-cache");
            xhr.setRequestHeader("Cache-Control", "no-store, no-cache, must-revalidate, post-check=0, pre-check=0");
            xhr.setRequestHeader("Expires", 0);
            xhr.setRequestHeader("Last-Modified", new Date(0));
            xhr.setRequestHeader("If-Modified-Since", new Date(0));
        }
        if (headers) {
            if (typeof headers === 'object') {
            for (var head in headers) {
                if (headers.hasOwnProperty(head)) {
                xhr.setRequestHeader(head, headers[head]);
                }
            }
            } else if(post && typeof post !== 'object') {
            xhr.setRequestHeader('Content-Type', headers);
            }
        }

        if (post && typeof post === 'object') {
            var qstr = [];
            for (var attr in post) {
            if (post.hasOwnProperty(attr)) {
                qstr.push(attr + '=' + encodeURI(post[attr]));
            }
            }
            post = qstr.join('&');
        }
        xhr.send(post);
    } catch (e) {
        handleFailure(Status.Connection, 0, "Error: could not connect (open)" + '\n' + url + '\n' + e.name + " - " + e.message);
    }
}

export function get(url: string, handleSuccess: SuccessHandler, handleFailure: FailureHandler, headers: Headers = {}, useCache: boolean = false) {
    doRequest(Method.Get, url, null, handleSuccess, handleFailure, headers, null, useCache);
}
export function post(url: string, post: any, handleSuccess: SuccessHandler, handleFailure: FailureHandler, headers: Headers = {}, progressUpdate: ProgressHandler | null = null, useCache: boolean = false) {
    doRequest(Method.Post, url, post, handleSuccess, handleFailure, headers, progressUpdate, useCache);
};
export function put(url: string, post: any, handleSuccess: SuccessHandler, handleFailure: FailureHandler, headers: Headers = {}, progressUpdate: ProgressHandler | null = null, useCache: boolean = false) {
    doRequest(Method.Put, url, post, handleSuccess, handleFailure, headers, progressUpdate, useCache);
};

/**
 *
 */
function getXHR(handleFailure: FailureHandler) {
    var xhr;
    if (window.XMLHttpRequest) {
        xhr = new XMLHttpRequest();
    } else if (window.ActiveXObject) {
        try {
            xhr = new ActiveXObject("Msxml2.XMLHTTP");
        } catch (e) {
            try {
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            } catch (e2) {
                handleFailure(Status.Connection, 0, "Error: could not connect (create) " + '\n' + e2.name + " - " + e2.message);
            }
        }
    }
    return xhr;
}
