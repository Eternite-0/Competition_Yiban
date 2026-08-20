package com.etsaion.academic;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.SecureRandom;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * One short-lived, in-memory academic-system session. Credentials and cookies
 * intentionally never leave this object and are never written to the database.
 */
public final class JwSession {
    public static final String DEFAULT_WEBVPN_BASE = "https://csvpn.lingnan.edu.cn/http/"
            + "77726476706e69737468656265737421fae00f902e3e6f5e7f06c7a99c406d36a1/";
    private static final String WEBVPN_HOST = "csvpn.lingnan.edu.cn";
    private static final String AUTH_PATH = "/https/77726476706e69737468656265737421f1e2559434357a467b1ac7a0915b243badf0ae285e0ed5da36/authserver";
    private static final String WEBVPN_SERVICE = "https://csvpn.lingnan.edu.cn/login?cas_login=true";
    private static final String RANDOM_CHARS = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Duration TIMEOUT = Duration.ofSeconds(20);

    private final String baseUrl;
    private final HttpClient http;
    private Challenge challenge;
    private boolean webvpnAuthenticated;
    private boolean academicAuthenticated;

    public JwSession(String requestedBaseUrl) {
        this.baseUrl = normalizeBaseUrl(requestedBaseUrl);
        this.http = HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .connectTimeout(TIMEOUT)
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public boolean isAcademicAuthenticated() {
        return academicAuthenticated;
    }

    public String beginWebvpn() {
        if (!isWebvpnUrl(baseUrl)) {
            throw new AcademicRemoteException(400, "当前地址不是受支持的 WebVPN 教务地址");
        }
        URI loginUri = URI.create(authLoginUrl());
        HttpResponse<String> page = sendText(get(loginUri, null));
        ensure2xx(page, "无法打开 WebVPN 登录页");
        Document doc = Jsoup.parse(page.body());
        Element form = doc.selectFirst("#pwdFromId");
        Element salt = doc.selectFirst("#pwdEncryptSalt");
        if (form == null || salt == null || form.attr("action").isBlank()) {
            throw new AcademicRemoteException(502, "WebVPN 登录页结构已变化");
        }
        Map<String, String> hidden = new LinkedHashMap<>();
        for (Element input : form.select("input[type=hidden][name]")) {
            hidden.put(input.attr("name"), input.val());
        }
        URI captchaUri = resolve(page.uri(), "getCaptcha.htl?" + System.currentTimeMillis());
        HttpResponse<byte[]> image = sendBytes(get(captchaUri, null));
        ensure2xx(image, "无法获取 WebVPN 验证码");
        challenge = new Challenge(resolve(page.uri(), form.attr("action")), hidden, salt.val(), image.body());
        return Base64.getEncoder().encodeToString(image.body());
    }

    public void completeWebvpn(String username, String password, String captcha) {
        if (challenge == null) {
            throw new AcademicRemoteException(400, "请先获取 WebVPN 验证码");
        }
        Map<String, String> form = new LinkedHashMap<>(challenge.hidden());
        form.put("username", safe(username));
        form.put("password", encryptWebvpnPassword(password, challenge.salt()));
        form.put("captcha", captcha == null ? "" : captcha.trim());
        URI uri = URI.create(challenge.postUrl() + "?service=" + encode(WEBVPN_SERVICE));
        HttpResponse<String> response = sendText(post(uri, form, authLoginUrl()));
        challenge = null;
        String error = visibleLoginError(response.body());
        if (error.toLowerCase().contains("captcha") || error.contains("验证码")) {
            throw new AcademicRemoteException(401, "WebVPN 验证码错误，请刷新后重试");
        }
        if (error.contains("用户名") || error.contains("密码") || error.toLowerCase().contains("password")) {
            throw new AcademicRemoteException(401, "WebVPN 用户名或密码错误");
        }
        if (response.statusCode() >= 400) {
            throw new AcademicRemoteException(401, "WebVPN 认证被拒绝");
        }
        webvpnAuthenticated = true;
        // Warm the target academic-system cookies in the same order as a browser redirect.
        sendText(get(URI.create(baseUrl), WEBVPN_SERVICE));
        sendText(get(URI.create(join("xtgl/index_initMenu.html?jsdm=xs&_t="
                + System.currentTimeMillis() + "&echarts=1")), baseUrl));
    }

    public void loginAcademic(String username, String password) {
        if (isWebvpnUrl(baseUrl) && !webvpnAuthenticated) {
            throw new AcademicRemoteException(401, "请先完成 WebVPN 登录");
        }
        String loginUrl = join("xtgl/login_slogin.html");
        HttpResponse<String> page = sendText(get(URI.create(loginUrl), loginUrl));
        ensure2xx(page, "无法打开教务系统登录页");
        Document doc = Jsoup.parse(page.body());
        String csrf = value(doc, "#csrftoken");
        JsonNode key = json(get(URI.create(join("xtgl/login_getPublicKey.html")), loginUrl));
        if (csrf == null || key.path("modulus").isMissingNode() || key.path("exponent").isMissingNode()) {
            throw new AcademicRemoteException(502, "教务登录页结构已变化");
        }
        Map<String, String> form = new LinkedHashMap<>();
        form.put("csrftoken", csrf);
        form.put("yhm", safe(username));
        form.put("mm", encryptAcademicPassword(password, key.path("modulus").asText(), key.path("exponent").asText()));
        HttpResponse<String> login = sendText(post(URI.create(loginUrl), form, loginUrl));
        ensure2xx(login, "教务系统登录失败");
        String tip = Jsoup.parse(login.body()).select("p#tips").text();
        if (!tip.isBlank()) {
            throw new AcademicRemoteException(401, normalizeAcademicLoginError(tip));
        }
        academicAuthenticated = true;
    }

    public Map<String, Object> info() {
        try {
            JsonNode data = json(get(URI.create(join("xsxxxggl/xsxxwh_cxCkDgxsxx.html?gnmkdm=N100801")), join("xtgl/index_initMenu.html")));
            if (data.isObject()) {
                return mapOf("sid", text(data, "xh"), "name", text(data, "xm"),
                        "collegeName", firstText(data, "zsjg_id", "jg_id"),
                        "majorName", firstText(data, "zszyh_id", "zyh_id"),
                        "className", firstText(data, "bh_id", "xjztdm"),
                        "status", text(data, "xjztdm"), "phoneNumber", text(data, "sjhm"), "email", text(data, "dzyx"));
            }
        } catch (AcademicRemoteException ignored) {
            // Some deployments return HTML here; use the legacy parser below.
        }
        return parseInfoHtml();
    }

    public Map<String, Object> gpa() {
        HttpResponse<String> response = sendText(get(URI.create(join("xsxy/xsxyqk_cxXsxyqkIndex.html?gnmkdm=N105515&layout=default")), join("xtgl/index_initMenu.html")));
        ensureAcademic(response);
        String content = Jsoup.parse(response.body()).text().replaceAll("\\s", "");
        Matcher matcher = Pattern.compile("(?:GPA|平均学分绩点)[：:]?([0-9]+(?:\\.[0-9]+)?)").matcher(content);
        if (!matcher.find()) {
            return Map.of();
        }
        return Map.of("gpa", new BigDecimal(matcher.group(1)));
    }

    public Map<String, Object> grades(int year, int term) {
        Map<String, String> form = queryForm(year, term);
        JsonNode data = json(post(URI.create(join("cjcx/cjcx_cxXsgrcj.html?doType=query&gnmkdm=N305005")), form, join("cjcx/")));
        List<Map<String, Object>> courses = new ArrayList<>();
        for (JsonNode row : data.path("items")) {
            courses.add(mapOf("courseId", text(row, "kch_id"), "title", text(row, "kcmc"),
                    "teacher", text(row, "jsxm"), "className", text(row, "jxbmc"),
                    "credit", decimal(text(row, "xf")), "category", text(row, "kclbmc"),
                    "nature", text(row, "kcxzmc"), "grade", valueOrNull(text(row, "cj")),
                    "gradePoint", decimal(text(row, "jd")), "gradeNature", text(row, "ksxz")));
        }
        return mapOf("sid", first(data, "xh"), "name", first(data, "xm"), "year", year,
                "term", term, "count", courses.size(), "courses", courses);
    }

    public Map<String, Object> schedule(int year, int term) {
        Map<String, String> form = new LinkedHashMap<>();
        form.put("xnm", String.valueOf(year));
        form.put("xqm", String.valueOf(termCode(term)));
        JsonNode data = json(post(URI.create(join("kbcx/xskbcx_cxXsKb.html?gnmkdm=N2151")), form, join("kbcx/")));
        List<Map<String, Object>> courses = new ArrayList<>();
        for (JsonNode row : data.path("kbList")) {
            courses.add(mapOf("courseId", text(row, "kch_id"), "title", text(row, "kcmc"),
                    "teacher", text(row, "xm"), "className", text(row, "jxbmc"),
                    "weekday", valueOrNull(text(row, "xqj")), "sessions", text(row, "jc"),
                    "weeks", text(row, "zcd"), "place", text(row, "cdmc"), "campus", text(row, "xqmc")));
        }
        return mapOf("sid", data.path("xsxx").path("XH").asText(null), "name", data.path("xsxx").path("XM").asText(null),
                "year", year, "term", term, "count", courses.size(), "courses", courses);
    }

    private Map<String, Object> parseInfoHtml() {
        HttpResponse<String> response = sendText(get(URI.create(join("xsxxxggl/xsgrxxwh_cxXsgrxx.html?gnmkdm=N100801")), join("xtgl/index_initMenu.html")));
        ensureAcademic(response);
        Document doc = Jsoup.parse(response.body());
        Map<String, String> fields = new LinkedHashMap<>();
        for (Element group : doc.select("div.form-group")) {
            String label = group.select("label").text();
            String value = group.select("p.form-control-static").text();
            if (!label.isBlank()) fields.put(label, value);
        }
        return mapOf("sid", pick(fields, "学号", "学号："), "name", pick(fields, "姓名", "姓名："),
                "collegeName", pick(fields, "学院名称", "学院名称："), "majorName", pick(fields, "专业名称", "专业名称："),
                "className", pick(fields, "班级名称", "班级名称："), "phoneNumber", pick(fields, "手机号码", "手机号码："),
                "email", pick(fields, "电子邮箱", "电子邮箱："));
    }

    private JsonNode json(HttpRequest request) {
        try {
            HttpResponse<String> response = sendText(request);
            ensureAcademic(response);
            return JSON.readTree(response.body());
        } catch (AcademicRemoteException e) {
            throw e;
        } catch (Exception e) {
            throw new AcademicRemoteException(502, "教务系统返回了无效数据");
        }
    }

    private HttpRequest get(URI uri, String referer) {
        HttpRequest.Builder builder = request(uri).GET();
        if (referer != null) builder.header("Referer", referer);
        return builder.build();
    }

    private HttpRequest post(URI uri, Map<String, String> form, String referer) {
        return request(uri).header("Referer", referer)
                .header("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(formEncode(form))).build();
    }

    private HttpRequest.Builder request(URI uri) {
        return HttpRequest.newBuilder(uri).timeout(TIMEOUT)
                .header("User-Agent", "Mozilla/5.0")
                .header("Accept-Language", "zh-CN,zh;q=0.9");
    }

    private HttpResponse<String> sendText(HttpRequest request) {
        try {
            return http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new AcademicRemoteException(502, "无法连接教务系统");
        }
    }

    private HttpResponse<byte[]> sendBytes(HttpRequest request) {
        try {
            return http.send(request, HttpResponse.BodyHandlers.ofByteArray());
        } catch (Exception e) {
            throw new AcademicRemoteException(502, "无法连接教务系统");
        }
    }

    private void ensure2xx(HttpResponse<?> response, String message) {
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new AcademicRemoteException(502, message + "（HTTP " + response.statusCode() + "）");
        }
    }

    private void ensureAcademic(HttpResponse<String> response) {
        ensure2xx(response, "教务系统请求失败");
        String body = response.body();
        if (response.uri().getPath().contains("login_slogin") || (body.contains("csrftoken") && body.contains("用户登录"))) {
            academicAuthenticated = false;
            throw new AcademicRemoteException(401, "教务系统会话已失效，请重新登录");
        }
    }

    private String join(String path) { return baseUrl + path; }

    private String authLoginUrl() { return "https://" + WEBVPN_HOST + AUTH_PATH + "/login?service=" + encode(WEBVPN_SERVICE); }

    private static URI resolve(URI base, String path) { return base.resolve(path); }

    private static boolean isWebvpnUrl(String url) {
        URI uri = URI.create(url);
        return WEBVPN_HOST.equalsIgnoreCase(uri.getHost()) && uri.getPath().contains("/http/");
    }

    private static String normalizeBaseUrl(String value) {
        String url = value == null || value.isBlank() ? DEFAULT_WEBVPN_BASE : value.trim();
        if (!url.startsWith("https://") && !url.startsWith("http://")) {
            throw new AcademicRemoteException(400, "教务系统地址必须以 http:// 或 https:// 开头");
        }
        return url.endsWith("/") ? url : url + "/";
    }

    private static String value(Document document, String selector) {
        Element element = document.selectFirst(selector);
        return element == null ? null : element.val();
    }

    private static String encode(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }

    private static String formEncode(Map<String, String> map) {
        return map.entrySet().stream().map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .reduce((left, right) -> left + "&" + right).orElse("");
    }

    private static String visibleLoginError(String html) {
        return Jsoup.parse(html).select("#showErrorTip,.form-error,.item-error-tip").text();
    }

    private static String normalizeAcademicLoginError(String tip) {
        String lower = tip.toLowerCase();
        if (tip.contains("用户名") || tip.contains("账号") || tip.contains("密码")
                || lower.contains("username") || lower.contains("password") || lower.contains("account")) {
            return "教务系统账号或密码错误";
        }
        if (tip.contains("验证码") || lower.contains("captcha") || lower.contains("verification")) {
            return "教务系统验证码错误，请刷新后重试";
        }
        return tip;
    }

    private static String encryptWebvpnPassword(String password, String salt) {
        try {
            byte[] iv = random(16).getBytes(StandardCharsets.UTF_8);
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(salt.getBytes(StandardCharsets.UTF_8), "AES"), new IvParameterSpec(iv));
            return Base64.getEncoder().encodeToString(cipher.doFinal((random(64) + safe(password)).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new AcademicRemoteException(502, "WebVPN 密码加密失败");
        }
    }

    private static String encryptAcademicPassword(String password, String modulus, String exponent) {
        try {
            BigInteger n = new BigInteger(1, Base64.getDecoder().decode(modulus));
            BigInteger e = new BigInteger(1, Base64.getDecoder().decode(exponent));
            RSAPublicKey key = (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(new RSAPublicKeySpec(n, e));
            Cipher cipher = Cipher.getInstance("RSA/ECB/PKCS1Padding");
            cipher.init(Cipher.ENCRYPT_MODE, key);
            return Base64.getEncoder().encodeToString(cipher.doFinal(safe(password).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new AcademicRemoteException(502, "教务系统密码加密失败");
        }
    }

    private static String random(int length) {
        SecureRandom random = new SecureRandom();
        StringBuilder value = new StringBuilder(length);
        for (int i = 0; i < length; i++) value.append(RANDOM_CHARS.charAt(random.nextInt(RANDOM_CHARS.length())));
        return value.toString();
    }

    private static int termCode(int term) { return term == 0 ? 0 : term == 1 ? 3 : 12; }

    private static Map<String, String> queryForm(int year, int term) {
        Map<String, String> form = new LinkedHashMap<>();
        form.put("xnm", String.valueOf(year));
        form.put("xqm", term == 0 ? "" : String.valueOf(termCode(term)));
        form.put("_search", "false");
        form.put("nd", String.valueOf(System.currentTimeMillis()));
        form.put("queryModel.showCount", "100");
        form.put("queryModel.currentPage", "1");
        form.put("queryModel.sortName", "");
        form.put("queryModel.sortOrder", "asc");
        form.put("time", "0");
        return form;
    }

    private static String text(JsonNode node, String name) {
        JsonNode value = node.path(name);
        return value.isMissingNode() || value.isNull() ? null : value.asText(null);
    }

    private static String firstText(JsonNode node, String... names) {
        for (String name : names) {
            String value = text(node, name);
            if (value != null && !value.isBlank()) return value;
        }
        return null;
    }

    private static String first(JsonNode root, String name) {
        JsonNode items = root.path("items");
        return items.isArray() && !items.isEmpty() ? text(items.get(0), name) : null;
    }

    private static Object decimal(String value) {
        try { return value == null || value.isBlank() ? null : new BigDecimal(value); }
        catch (Exception ignored) { return null; }
    }

    private static Object valueOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        try { return Integer.valueOf(value); } catch (Exception ignored) { return value; }
    }

    private static Map<String, Object> mapOf(Object... values) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int i = 0; i + 1 < values.length; i += 2) {
            if (values[i + 1] != null) result.put((String) values[i], values[i + 1]);
        }
        return result;
    }

    private static String pick(Map<String, String> fields, String... names) {
        for (String name : names) if (fields.containsKey(name)) return fields.get(name);
        return null;
    }

    private static String safe(String value) { return value == null ? "" : value; }

    private record Challenge(URI postUrl, Map<String, String> hidden, String salt, byte[] image) { }
}
