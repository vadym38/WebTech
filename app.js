(function () {
    const e = React.createElement;
    const API = "index.php";

    const initialState = {
        page: "home",
        user: JSON.parse(localStorage.getItem("tutors_user") || "null"),
        lessons: [],
        teachers: [],
        subjects: [],
        students: [],
        schedules: [],
        reviews: [],
        payments: [],
        loading: false,
        error: "",
        selectedLesson: null,
        message: ""
    };

    function reducer(state, action) {
        if (action.type === "NAVIGATE") {
            return { ...state, page: action.page, message: "", error: "" };
        }

        if (action.type === "LOGIN") {
            localStorage.setItem("tutors_user", JSON.stringify(action.user));
            return { ...state, user: action.user, page: "lessons" };
        }

        if (action.type === "LOGOUT") {
            localStorage.removeItem("tutors_user");
            return { ...state, user: null, page: "home", selectedLesson: null };
        }

        if (action.type === "LOAD_START") {
            return { ...state, loading: true, error: "" };
        }

        if (action.type === "LOAD_SUCCESS") {
            return { ...state, ...action.payload, loading: false, error: "" };
        }

        if (action.type === "LOAD_ERROR") {
            return { ...state, loading: false, error: action.error };
        }

        if (action.type === "SELECT_LESSON") {
            return { ...state, selectedLesson: action.lesson, page: "edit", message: "", error: "" };
        }

        if (action.type === "SAVE_SUCCESS") {
            return {
                ...state,
                lessons: state.lessons.map(item => String(item.id) === String(action.lesson.id) ? action.lesson : item),
                selectedLesson: action.lesson,
                message: "Дані уроку збережено"
            };
        }

        return state;
    }

    function getValue(item, names) {
        for (const name of names) {
            if (item && item[name] !== undefined && item[name] !== null && item[name] !== "") {
                return item[name];
            }
        }

        return "";
    }

    function findName(list, id) {
        const row = list.find(item => String(item.id) === String(id));
        return row ? getValue(row, ["name", "title", "full_name", "date", "time", "value", "comment", "amount", "price"]) : "";
    }

    function fieldValue(row, variants) {
        return getValue(row, variants);
    }

    function lessonView(lesson, state) {
        const teacherId = fieldValue(lesson, ["teacher_id", "id_teacher", "teacher"]);
        const subjectId = fieldValue(lesson, ["subject_id", "id_subject", "subject"]);
        const studentId = fieldValue(lesson, ["student_id", "id_student", "student"]);
        const scheduleId = fieldValue(lesson, ["schedule_id", "id_schedule", "schedule"]);
        const reviewId = fieldValue(lesson, ["review_id", "id_review", "review"]);
        const paymentId = fieldValue(lesson, ["payment_id", "id_payment", "payment"]);

        return {
            id: lesson.id,
            teacherId,
            subjectId,
            studentId,
            teacher: findName(state.teachers, teacherId) || teacherId,
            subject: findName(state.subjects, subjectId) || subjectId,
            student: findName(state.students, studentId) || studentId,
            schedule: findName(state.schedules, scheduleId) || fieldValue(lesson, ["date", "lesson_date", "time"]) || scheduleId,
            review: findName(state.reviews, reviewId) || fieldValue(lesson, ["review_text", "comment"]) || reviewId || "-",
            payment: findName(state.payments, paymentId) || fieldValue(lesson, ["amount", "price"]) || paymentId || "-"
        };
    }

    function fetchResource(resource) {
        return fetch(API + "/" + resource).then(response => {
            if (!response.ok) {
                throw new Error("Не вдалося завантажити " + resource);
            }

            return response.json();
        });
    }

    function App() {
        const [state, dispatch] = React.useReducer(reducer, initialState);

        React.useEffect(() => {
            loadData(dispatch);
        }, []);

        return e("div", { className: "app" },
            e(Header, { state, dispatch }),
            e("main", { className: "layout" },
                state.page === "home" && e(HomePage, { state, dispatch }),
                state.page === "lessons" && e(LessonsPage, { state, dispatch }),
                state.page === "edit" && e(EditPage, { state, dispatch }),
                state.page === "login" && e(LoginPage, { dispatch })
            )
        );
    }

    function Header({ state, dispatch }) {
        const navItems = [
            ["home", "Головна"],
            ["lessons", "Уроки"],
            ["edit", "Редагування"]
        ];

        return e("header", { className: "topbar" },
            e("div", { className: "brand" }, "Tutors Finder"),
            e("nav", { className: "nav" },
                navItems.map(([page, title]) => e("button", {
                    key: page,
                    className: state.page === page ? "active" : "",
                    onClick: () => dispatch({ type: "NAVIGATE", page })
                }, title))
            ),
            e("div", { className: "user-panel" },
                state.user
                    ? [
                        e("span", { className: "user-name", key: "name" }, state.user.name),
                        e("button", { key: "logout", onClick: () => dispatch({ type: "LOGOUT" }) }, "Вийти")
                    ]
                    : e("button", { onClick: () => dispatch({ type: "NAVIGATE", page: "login" }) }, "Увійти")
            )
        );
    }

    function HomePage({ state, dispatch }) {
        return e("div", { className: "hero" },
            e("section", { className: "section" },
                e("h1", { className: "hero-title" }, "SPA для сервісу пошуку репетиторів"),
                e("p", { className: "muted" }, "Додаток має навігацію між сторінками, авторизацію, власний стан компонентів, завантаження даних з API та форму редагування уроку."),
                e("div", { className: "stats" },
                    e("div", { className: "stat" }, e("strong", null, state.teachers.length), e("span", null, "Викладачі")),
                    e("div", { className: "stat" }, e("strong", null, state.subjects.length), e("span", null, "Предмети")),
                    e("div", { className: "stat" }, e("strong", null, state.lessons.length), e("span", null, "Уроки"))
                ),
                e("p", null,
                    e("button", { className: "primary", onClick: () => dispatch({ type: "NAVIGATE", page: "lessons" }) }, "Перейти до уроків")
                )
            ),
            e("section", { className: "section" },
                e("h2", null, "Компонент зі стейтом"),
                e("p", { className: "muted" }, "Лічильник нижче має власний локальний стан і реагує на події кнопок."),
                e(LocalCounter)
            )
        );
    }

    function LocalCounter() {
        const [count, setCount] = React.useState(0);

        return e("div", { className: "counter" },
            e("button", { className: "secondary", onClick: () => setCount(count - 1) }, "-"),
            e("strong", null, count),
            e("button", { className: "secondary", onClick: () => setCount(count + 1) }, "+"),
            e("button", { className: "primary", onClick: () => setCount(0) }, "Скинути")
        );
    }

    function LessonsPage({ state, dispatch }) {
        const [filters, setFilters] = React.useState({
            teacher: "",
            subject: "",
            student: "",
            search: "",
            sort: "id"
        });

        const rows = state.lessons.map(lesson => lessonView(lesson, state))
            .filter(item => !filters.teacher || String(item.teacherId) === String(filters.teacher))
            .filter(item => !filters.subject || String(item.subjectId) === String(filters.subject))
            .filter(item => !filters.student || String(item.studentId) === String(filters.student))
            .filter(item => !filters.search || Object.values(item).join(" ").toLowerCase().includes(filters.search.toLowerCase()))
            .sort((a, b) => {
                if (filters.sort === "id") {
                    return Number(a.id) - Number(b.id);
                }

                return String(a[filters.sort]).localeCompare(String(b[filters.sort]), "uk");
            });

        return e("section", { className: "section" },
            e("h2", null, "Уроки"),
            state.error && e("div", { className: "notice error" }, state.error),
            state.loading && e("div", { className: "notice" }, "Завантаження даних..."),
            e(Filters, { state, filters, setFilters, reload: () => loadData(dispatch) }),
            e("div", { className: "table-wrap" },
                e("table", null,
                    e("thead", null,
                        e("tr", null,
                            e("th", null, "ID"),
                            e("th", null, "Викладач"),
                            e("th", null, "Предмет"),
                            e("th", null, "Учень"),
                            e("th", null, "Розклад"),
                            e("th", null, "Відгук"),
                            e("th", null, "Оплата"),
                            e("th", null, "Дія")
                        )
                    ),
                    e("tbody", null,
                        rows.length
                            ? rows.map(row => e("tr", { key: row.id },
                                e("td", null, row.id),
                                e("td", null, row.teacher),
                                e("td", null, row.subject),
                                e("td", null, row.student),
                                e("td", null, row.schedule),
                                e("td", null, row.review),
                                e("td", null, row.payment),
                                e("td", null,
                                    e("button", {
                                        className: "secondary",
                                        onClick: () => {
                                            const lesson = state.lessons.find(item => String(item.id) === String(row.id));
                                            dispatch({ type: "SELECT_LESSON", lesson });
                                        }
                                    }, "Редагувати")
                                )
                            ))
                            : e("tr", null, e("td", { colSpan: 8 }, "Даних не знайдено"))
                    )
                )
            )
        );
    }

    function Filters({ state, filters, setFilters, reload }) {
        function update(name, value) {
            setFilters({ ...filters, [name]: value });
        }

        return e("div", { className: "section" },
            e("div", { className: "filters" },
                e(SelectField, { label: "Викладач", value: filters.teacher, onChange: value => update("teacher", value), list: state.teachers, empty: "Усі викладачі" }),
                e(SelectField, { label: "Предмет", value: filters.subject, onChange: value => update("subject", value), list: state.subjects, empty: "Усі предмети" }),
                e(SelectField, { label: "Учень", value: filters.student, onChange: value => update("student", value), list: state.students, empty: "Усі учні" }),
                e("div", null,
                    e("label", null, "Пошук"),
                    e("input", { value: filters.search, placeholder: "Текст для пошуку", onChange: event => update("search", event.target.value) })
                ),
                e("div", null,
                    e("label", null, "Сортування"),
                    e("select", { value: filters.sort, onChange: event => update("sort", event.target.value) },
                        e("option", { value: "id" }, "За номером"),
                        e("option", { value: "teacher" }, "За викладачем"),
                        e("option", { value: "subject" }, "За предметом"),
                        e("option", { value: "student" }, "За учнем"),
                        e("option", { value: "schedule" }, "За розкладом")
                    )
                ),
                e("button", { className: "primary", onClick: reload }, "Оновити")
            )
        );
    }

    function SelectField({ label, value, onChange, list, empty }) {
        return e("div", null,
            e("label", null, label),
            e("select", { value, onChange: event => onChange(event.target.value) },
                e("option", { value: "" }, empty),
                list.map(item => e("option", { key: item.id, value: item.id }, findName(list, item.id) || item.id))
            )
        );
    }

    function LoginPage({ dispatch }) {
        const [form, setForm] = React.useState({ name: "", password: "" });
        const [error, setError] = React.useState("");

        function submit(event) {
            event.preventDefault();

            if (!form.name.trim() || !form.password.trim()) {
                setError("Заповніть логін і пароль");
                return;
            }

            dispatch({ type: "LOGIN", user: { name: form.name.trim() } });
        }

        return e("div", { className: "auth-wrap" },
            e("form", { className: "auth-card", onSubmit: submit },
                e("h1", null, "Авторизація"),
                e("p", { className: "muted" }, "Для лабораторної використано навчальну авторизацію без серверної перевірки."),
                error && e("div", { className: "notice error" }, error),
                e("p", null,
                    e("label", null, "Логін"),
                    e("input", { value: form.name, onChange: event => setForm({ ...form, name: event.target.value }), placeholder: "admin" })
                ),
                e("p", null,
                    e("label", null, "Пароль"),
                    e("input", { type: "password", value: form.password, onChange: event => setForm({ ...form, password: event.target.value }), placeholder: "1234" })
                ),
                e("button", { className: "primary", type: "submit" }, "Увійти")
            )
        );
    }

    function EditPage({ state, dispatch }) {
        if (!state.user) {
            return e("section", { className: "section" },
                e("h2", null, "Редагування"),
                e("div", { className: "notice" }, "Щоб редагувати дані, потрібно авторизуватись."),
                e("button", { className: "primary", onClick: () => dispatch({ type: "NAVIGATE", page: "login" }) }, "Увійти")
            );
        }

        if (!state.selectedLesson) {
            return e("section", { className: "section" },
                e("h2", null, "Редагування"),
                e("div", { className: "notice" }, "Оберіть урок у таблиці на сторінці 'Уроки'."),
                e("button", { className: "primary", onClick: () => dispatch({ type: "NAVIGATE", page: "lessons" }) }, "До уроків")
            );
        }

        return e(EditForm, { state, dispatch });
    }

    function EditForm({ state, dispatch }) {
        const [form, setForm] = React.useState({ ...state.selectedLesson });
        const fields = Object.keys(form).filter(key => key !== "id");

        React.useEffect(() => {
            setForm({ ...state.selectedLesson });
        }, [state.selectedLesson]);

        function update(name, value) {
            setForm({ ...form, [name]: value });
        }

        function submit(event) {
            event.preventDefault();

            fetch(API + "/lesson/" + form.id, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            }).then(response => {
                if (!response.ok) {
                    throw new Error("Помилка збереження");
                }

                return response.json();
            }).then(data => {
                dispatch({ type: "SAVE_SUCCESS", lesson: data });
                loadData(dispatch);
            }).catch(error => {
                dispatch({ type: "LOAD_ERROR", error: error.message });
            });
        }

        return e("form", { className: "form-card", onSubmit: submit },
            e("h2", null, "Редагування уроку #" + form.id),
            state.message && e("div", { className: "notice success" }, state.message),
            state.error && e("div", { className: "notice error" }, state.error),
            e("div", { className: "form-grid" },
                fields.map(name => e("div", { key: name },
                    e("label", null, name),
                    e("input", { value: form[name] || "", onChange: event => update(name, event.target.value) })
                ))
            ),
            e("p", { className: "actions" },
                e("button", { className: "primary", type: "submit" }, "Зберегти"),
                e("button", { className: "secondary", type: "button", onClick: () => dispatch({ type: "NAVIGATE", page: "lessons" }) }, "Назад")
            )
        );
    }

    function loadData(dispatch) {
        dispatch({ type: "LOAD_START" });

        Promise.all([
            fetchResource("lesson"),
            fetchResource("teacher"),
            fetchResource("subject"),
            fetchResource("student"),
            fetchResource("schedule"),
            fetchResource("review"),
            fetchResource("payment")
        ]).then(data => {
            dispatch({
                type: "LOAD_SUCCESS",
                payload: {
                    lessons: data[0],
                    teachers: data[1],
                    subjects: data[2],
                    students: data[3],
                    schedules: data[4],
                    reviews: data[5],
                    payments: data[6]
                }
            });
        }).catch(error => {
            dispatch({ type: "LOAD_ERROR", error: error.message });
        });
    }

    ReactDOM.createRoot(document.getElementById("root")).render(e(App));
})();
