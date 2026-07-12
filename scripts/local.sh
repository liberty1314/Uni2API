#!/usr/bin/env bash

# ==============================================================================
# ChatGPT2API 本地运行管理脚本
# 用法: ./scripts/local.sh [setup|doctor|start|stop|restart|status|logs|free-port|help]
# 无参数运行时进入交互菜单。
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# ==============================================================================
# 服务配置区
# ==============================================================================

PROJECT_NAME="ChatGPT2API"

SERVICE_KEYS=("backend" "frontend")
SERVICE_NAMES=("后端 API 服务" "前端开发服务")
SERVICE_DIRS=("." "web")
SERVICE_COMMANDS=(
    "uv run uvicorn main:app --host 0.0.0.0 --port 8000 --access-log"
    "pnpm exec next dev --webpack -H 0.0.0.0 -p 3000"
)
SERVICE_PORTS=("8000" "3000")
SERVICE_URLS=("http://localhost:8000" "http://localhost:3000")
SERVICE_HEALTH_URLS=("" "")
SERVICE_START_TIMEOUTS=("30" "45")

REQUIRED_COMMANDS=("uv" "pnpm")

# ==============================================================================
# 首次环境准备配置区
# ==============================================================================

START_AUTO_SETUP=true
SETUP_COMMANDS=("uv sync" "pnpm --dir web approve-builds --all" "pnpm --dir web install")

ENV_TEMPLATE_FILES=(".env.example" ".env.sample")
LOCAL_ENV_FILE=".env.local"
ENV_FILES=("$LOCAL_ENV_FILE" ".env")

REQUIRED_ENV_VARS=("CHATGPT2API_AUTH_KEY")
PLACEHOLDER_ENV_VALUES=(
    "CHATGPT2API_AUTH_KEY=your_secret_key_here"
    "GIT_TOKEN=your_git_token_here"
)

MANUAL_CONFIG_ITEMS=(
    "在 .env.local 中把 CHATGPT2API_AUTH_KEY 改成你自己的本地访问密钥；也可以在 config.json 的 auth-key 中配置。"
    "如使用 STORAGE_BACKEND=postgres，需要填写 DATABASE_URL。"
    "如使用 STORAGE_BACKEND=git，需要填写 GIT_REPO_URL 和 GIT_TOKEN。"
    "如启用 WARP / FlareSolverr，请使用 docker-compose.warp.yml，并按 .env.example 补齐代理端口与运行时配置。"
    "账号导入、CPA/sub2api 服务器、代理地址、第三方凭据需要在 Web 面板或配置文件中人工补齐。"
)

# ==============================================================================
# 运行态目录
# ==============================================================================

RUNTIME_DIR="$ROOT_DIR/.runtime"
LOG_DIR="$RUNTIME_DIR/logs"
PID_DIR="$RUNTIME_DIR/pids"

# ==============================================================================
# 输出样式
# ==============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[信息]${NC} $1"; }
log_success() { echo -e "${GREEN}[成功]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[警告]${NC} $1"; }
log_error() { echo -e "${RED}[错误]${NC} $1"; }
log_step() { echo -e "${CYAN}[步骤]${NC} $1"; }

print_banner() {
    echo -e "${CYAN}"
    echo "============================================================"
    echo "$PROJECT_NAME 本地运行管理"
    echo "============================================================"
    echo -e "${NC}"
}

service_access_url() {
    local index=$1
    local configured_url="${SERVICE_URLS[$index]:-}"
    local port="${SERVICE_PORTS[$index]:-}"

    if [[ -n "$configured_url" ]]; then
        echo "$configured_url"
    elif [[ -n "${port}" ]]; then
        echo "http://localhost:${port}"
    fi
}

print_service_urls() {
    local has_url=false
    local index

    for index in "${!SERVICE_KEYS[@]}"; do
        local url
        url=$(service_access_url "$index")
        if [[ -n "$url" ]]; then
            has_url=true
            break
        fi
    done

    [[ "$has_url" == true ]] || return 0

    echo -e "${CYAN}访问地址:${NC}"
    for index in "${!SERVICE_KEYS[@]}"; do
        local name="${SERVICE_NAMES[$index]}"
        local port="${SERVICE_PORTS[$index]:-}"
        local url
        local state="未确认"
        url=$(service_access_url "$index")
        [[ -n "$url" ]] || continue

        if [[ -n "${port}" ]] && check_port "${port}"; then
            state="运行中"
        elif [[ -n "${port}" ]]; then
            state="未监听"
        fi

        echo "  - ${name}: $url ($state)"
    done
    echo
}

show_usage() {
    cat <<'USAGE'
用法: ./scripts/local.sh [命令]

不带命令时会进入交互菜单。

命令:
  setup    自动准备首次运行环境
  doctor   检查依赖、环境文件、必填配置和运行态目录
  start    自动准备环境后启动本地服务
  stop     停止本地服务
  restart  重启本地服务
  status   查看服务状态
  logs     查看并追踪服务日志
  free-port [端口] [--yes]
           解除占用端口；不传端口时处理服务配置中的端口
  help     查看帮助

首次启动建议:
  ./scripts/local.sh setup
  ./scripts/local.sh doctor
  ./scripts/local.sh start

本项目默认本地开发地址:
  后端 API: http://localhost:8000
  前端页面: http://localhost:3000

说明:
  setup 会创建 .runtime、复制 .env.example 到 .env.local，并执行 uv sync 与 pnpm --dir web install。
  start 会先执行 setup，再分别启动后端 API 与前端开发服务。
  API Key、数据库密码、账号导入源、代理地址、第三方凭据等真实配置需要人工填写。
USAGE
}

show_menu() {
    print_banner
    print_service_urls
    echo -e "${CYAN}请选择操作:${NC}"
    echo
    echo -e "  ${GREEN}1)${NC} 自动准备首次运行环境 (Setup)"
    echo -e "  ${BLUE}2)${NC} 检查运行环境 (Doctor)"
    echo -e "  ${GREEN}3)${NC} 启动服务 (Start)"
    echo -e "  ${RED}4)${NC} 停止服务 (Stop)"
    echo -e "  ${YELLOW}5)${NC} 重启服务 (Restart)"
    echo -e "  ${BLUE}6)${NC} 查看状态 (Status)"
    echo -e "  ${BLUE}7)${NC} 查看日志 (Logs)"
    echo -e "  ${YELLOW}8)${NC} 解除占用端口 (Free Port)"
    echo -e "  ${RED}0)${NC} 退出 (Exit)"
    echo
    echo -n "请输入选项 [0-8]: "
}

pause_for_menu() {
    echo
    read -r -n 1 -s -p "按任意键返回菜单..."
    echo
}

interactive_menu() {
    local choice

    while true; do
        if command -v clear >/dev/null 2>&1; then
            clear
        fi

        show_menu
        read -r choice
        echo

        case "${choice}" in
            1)
                do_setup
                pause_for_menu
                ;;
            2)
                do_doctor || true
                pause_for_menu
                ;;
            3)
                do_start
                pause_for_menu
                ;;
            4)
                do_stop
                pause_for_menu
                ;;
            5)
                do_restart
                pause_for_menu
                ;;
            6)
                do_status
                pause_for_menu
                ;;
            7)
                do_logs
                ;;
            8)
                local port
                echo -n "请输入要解除占用的端口，留空则处理服务配置端口: "
                read -r port
                do_free_port "${port}" ""
                pause_for_menu
                ;;
            0|q|Q)
                echo "再见！"
                exit 0
                ;;
            *)
                log_error "无效选项，请输入 0-8"
                sleep 1
                ;;
        esac
    done
}

prepare_runtime_dirs() {
    mkdir -p "$LOG_DIR" "$PID_DIR"
}

pid_file_for() {
    local key=$1
    echo "$PID_DIR/$key.pid"
}

log_file_for() {
    local key=$1
    echo "$LOG_DIR/$key.log"
}

check_process() {
    local pid=$1
    [[ -n "${pid}" ]] && ps -p "${pid}" >/dev/null 2>&1
}

check_port() {
    local port=$1
    [[ -n "${port}" ]] || return 1

    if command -v lsof >/dev/null 2>&1; then
        lsof -Pi ":${port}" -sTCP:LISTEN -t >/dev/null 2>&1
        return $?
    fi

    if command -v nc >/dev/null 2>&1; then
        nc -z localhost "${port}" >/dev/null 2>&1
        return $?
    fi

    return 1
}

pids_for_port() {
    local port=$1

    if ! command -v lsof >/dev/null 2>&1; then
        return 1
    fi

    lsof -ti :"${port}" 2>/dev/null || true
}

describe_port_processes() {
    local port=$1
    local pids=$2

    echo
    echo -e "${YELLOW}端口 ${port} 当前占用进程:${NC}"
    local pid
    for pid in ${pid}s; do
        if ps -p "${pid}" >/dev/null 2>&1; then
            ps -p "${pid}" -o pid=,ppid=,command=
        else
            echo "  PID ${pid} 已不存在"
        fi
    done
    echo
}

confirm_free_port() {
    local port=$1
    local yes_flag=${2:-}

    if [[ "${yes_flag}" == "--yes" || "${yes_flag}" == "-y" ]]; then
        return 0
    fi

    local answer
    echo -n "确认停止占用端口 ${port} 的进程？[y/N] "
    read -r answer
    [[ "${answer}" =~ ^[Yy]$ ]]
}

free_one_port() {
    local port=$1
    local yes_flag=${2:-}

    if [[ -z "${port}" ]]; then
        return 0
    fi

    if ! command -v lsof >/dev/null 2>&1; then
        log_error "未找到 lsof，无法自动识别端口占用进程"
        return 1
    fi

    local pids
    pids=$(pids_for_port "${port}")
    if [[ -z "${pid}s" ]]; then
        log_success "端口 ${port} 未被占用"
        return 0
    fi

    describe_port_processes "${port}" "${pid}s"
    if ! confirm_free_port "${port}" "${yes_flag}"; then
        log_info "已取消解除端口 ${port} 占用"
        return 0
    fi

    local pid
    for pid in ${pid}s; do
        stop_process "${pid}" "端口 ${port} 占用进程"
    done

    log_success "端口 ${port} 已处理"
}

unique_service_ports() {
    local seen=""
    local port

    for port in "${SERVICE_PORTS[@]}"; do
        [[ -n "${port}" ]] || continue
        case " $seen " in
            *" ${port} "*) ;;
            *)
                seen="$seen ${port}"
                echo "${port}"
                ;;
        esac
    done
}

wait_for_port() {
    local port=$1
    local name=$2
    local timeout=$3
    local count=0

    [[ -n "${port}" ]] || return 0
    [[ "${timeout}" != "0" ]] || return 0

    log_step "等待 ${name} 启动，端口 ${port}，超时 ${timeout}s"
    while [[ ${count} -lt ${timeout} ]]; do
        if check_port "${port}"; then
            log_success "${name} 已监听端口 ${port}"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done

    log_error "${name} 启动超时，请查看 .runtime/logs/ 下对应服务日志"
    return 1
}

copy_environment_template() {
    if [[ -f "$LOCAL_ENV_FILE" ]]; then
        log_success "本地环境文件已存在：$LOCAL_ENV_FILE"
        return 0
    fi

    local template_file
    for template_file in "${ENV_TEMPLATE_FILES[@]}"; do
        if [[ -f "$template_file" ]]; then
            cp "$template_file" "$LOCAL_ENV_FILE"
            log_success "已从 $template_file 创建 $LOCAL_ENV_FILE"
            log_warning "请检查 $LOCAL_ENV_FILE，并补齐真实密钥、账号、数据库、代理等人工配置"
            return 0
        fi
    done

    log_info "未找到环境模板文件：${ENV_TEMPLATE_FILES[*]}"
}

run_setup_commands() {
    local command_line
    for command_line in "${SETUP_COMMANDS[@]}"; do
        [[ -n "${command_line}" ]] || continue
        log_step "执行环境准备命令：${command_line}"
        bash -lc "${command_line}"
        log_success "环境准备命令完成：${command_line}"
    done
}

print_manual_config_items() {
    [[ ${#MANUAL_CONFIG_ITEMS[@]} -gt 0 ]] || return 0

    echo
    echo -e "${YELLOW}需要人工确认或填写的配置:${NC}"
    local item
    for item in "${MANUAL_CONFIG_ITEMS[@]}"; do
        echo "  - ${item}"
    done
    echo
}

load_environment() {
    local env_file
    for env_file in "${ENV_FILES[@]}"; do
        if [[ -f "$env_file" ]]; then
            set -a
            # shellcheck disable=SC1090
            source "$env_file"
            set +a
            log_success "已加载环境文件 $env_file"
        fi
    done
}

check_environment_files() {
    local found_env=false
    local env_file

    for env_file in "${ENV_FILES[@]}"; do
        if [[ -f "$env_file" ]]; then
            found_env=true
            break
        fi
    done

    if [[ "${found_env}" == false ]]; then
        log_warning "未找到环境文件：${ENV_FILES[*]}"
        log_info "可执行 ./scripts/local.sh setup 自动复制模板"
    fi
}

is_placeholder_env_value() {
    local var_name=$1
    local value=$2
    local pair

    for pair in "${PLACEHOLDER_ENV_VALUES[@]}"; do
        if [[ "$pair" == "$var_name=${value}" ]]; then
            return 0
        fi
    done

    return 1
}

check_required_env_vars() {
    local missing=()
    local placeholders=()
    local var_name

    for var_name in "${REQUIRED_ENV_VARS[@]}"; do
        [[ "$var_name" == "CHATGPT2API_AUTH_KEY" ]] && continue
        if [[ -z "${!var_name:-}" ]]; then
            missing+=("$var_name")
        elif is_placeholder_env_value "$var_name" "${!var_name}"; then
            placeholders+=("$var_name")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "缺少必填环境变量：${missing[*]}"
        log_info "请在 $LOCAL_ENV_FILE 或 .env 中补齐后重试"
        print_manual_config_items
        exit 1
    fi

    if [[ ${#placeholders[@]} -gt 0 ]]; then
        log_warning "以下环境变量仍是示例值：${placeholders[*]}"
        log_info "本地服务可以启动，但请尽快改成自己的真实配置"
    fi
}

config_auth_key() {
    [[ -f "config.json" ]] || return 0

    if command -v python3 >/dev/null 2>&1; then
        python3 -c 'import json; print(str(json.load(open("config.json", encoding="utf-8")).get("auth-key") or "").strip())' 2>/dev/null || true
        return 0
    fi

    sed -n 's/^[[:space:]]*"auth-key"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' config.json | head -n 1
}

effective_auth_key() {
    local env_auth_key="${CHATGPT2API_AUTH_KEY:-}"
    if [[ -n "$env_auth_key" ]]; then
        echo "$env_auth_key"
        return 0
    fi

    config_auth_key
}

check_auth_config() {
    local auth_key
    auth_key="$(effective_auth_key)"

    if [[ -z "${auth_key}" ]]; then
        log_error "缺少访问密钥：请在 $LOCAL_ENV_FILE 中配置 CHATGPT2API_AUTH_KEY，或在 config.json 中填写 auth-key"
        print_manual_config_items
        return 1
    fi

    if is_placeholder_env_value "CHATGPT2API_AUTH_KEY" "${auth_key}"; then
        log_warning "当前访问密钥仍是示例值，请尽快改成自己的本地密钥"
    else
        log_success "访问密钥检查通过"
    fi
}

check_storage_config() {
    local backend="${STORAGE_BACKEND:-json}"
    backend="$(echo "${backend}" | tr '[:upper:]' '[:lower:]')"

    case "${backend}" in
        json)
            log_success "存储后端：json"
            ;;
        sqlite)
            log_success "存储后端：sqlite"
            ;;
        postgres|postgresql)
            if [[ -z "${DATABASE_URL:-}" ]]; then
                log_error "STORAGE_BACKEND=${backend} 时必须配置 DATABASE_URL"
                return 1
            fi
            log_success "PostgreSQL 数据库配置已提供"
            ;;
        git)
            local failed=0
            if [[ -z "${GIT_REPO_URL:-}" ]]; then
                log_error "STORAGE_BACKEND=git 时必须配置 GIT_REPO_URL"
                failed=1
            fi
            if [[ -z "${GIT_TOKEN:-}" ]] || is_placeholder_env_value "GIT_TOKEN" "${GIT_TOKEN:-}"; then
                log_error "STORAGE_BACKEND=git 时必须配置真实 GIT_TOKEN"
                failed=1
            fi
            return "${failed}"
            ;;
        *)
            log_error "未知 STORAGE_BACKEND：${backend}，可选 json、sqlite、postgres、git"
            return 1
            ;;
    esac
}

check_dependencies() {
    local missing=()
    local command_name

    for command_name in "${REQUIRED_COMMANDS[@]}"; do
        if ! command -v "${command_name}" >/dev/null 2>&1; then
            missing+=("${command_name}")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "缺少必需命令：${missing[*]}"
        log_info "请先安装缺失命令，再运行 ./scripts/local.sh setup"
        exit 1
    fi

    if ! command -v lsof >/dev/null 2>&1 && ! command -v nc >/dev/null 2>&1; then
        log_warning "未找到 lsof 或 nc，端口检测能力受限"
    fi
}

doctor_check_dependencies() {
    local missing=()
    local command_name

    for command_name in "${REQUIRED_COMMANDS[@]}"; do
        if ! command -v "${command_name}" >/dev/null 2>&1; then
            missing+=("${command_name}")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "缺少必需命令：${missing[*]}"
        return 1
    fi

    log_success "必需命令检查通过"
    return 0
}

doctor_check_environment() {
    local failed=0
    local found_env=false
    local found_template=false
    local env_file
    local template_file

    for env_file in "${ENV_FILES[@]}"; do
        if [[ -f "$env_file" ]]; then
            log_success "环境文件存在：$env_file"
            found_env=true
        fi
    done

    for template_file in "${ENV_TEMPLATE_FILES[@]}"; do
        if [[ -f "$template_file" ]]; then
            found_template=true
        fi
    done

    if [[ "${found_env}" == false && "${found_template}" == true ]]; then
        log_warning "发现环境模板但未找到本地环境文件：$LOCAL_ENV_FILE"
        log_info "可执行 ./scripts/local.sh setup 自动复制模板"
    elif [[ "${found_env}" == false ]]; then
        log_info "未发现环境文件或环境模板，跳过环境文件检查"
    else
        log_success "环境文件检查通过"
    fi

    load_environment

    local var_name
    for var_name in "${REQUIRED_ENV_VARS[@]}"; do
        [[ "$var_name" == "CHATGPT2API_AUTH_KEY" ]] && continue
        if [[ -z "${!var_name:-}" ]]; then
            log_error "必填环境变量未配置：$var_name"
            failed=1
        elif is_placeholder_env_value "$var_name" "${!var_name}"; then
            log_warning "必填环境变量仍是示例值：$var_name"
        else
            log_success "必填环境变量已配置：$var_name"
        fi
    done

    check_auth_config || failed=1
    check_storage_config || failed=1
    return "${failed}"
}

ensure_no_conflict() {
    local conflict=false

    for index in "${!SERVICE_KEYS[@]}"; do
        local name=${SERVICE_NAMES[$index]}
        local port=${SERVICE_PORTS[$index]}

        if [[ -n "${port}" ]] && check_port "${port}"; then
            log_warning "${name} 端口 ${port} 已被占用"
            conflict=true
        fi
    done

    if [[ "$conflict" == true ]]; then
        log_error "存在端口冲突，请先执行 ${0} free-port 或手动释放端口"
        exit 1
    fi
}

run_health_check() {
    local name=$1
    local health_url=$2

    [[ -n "${health_url}" ]] || return 0

    if ! command -v curl >/dev/null 2>&1; then
        log_warning "未找到 curl，跳过 ${name} 健康检查"
        return 0
    fi

    if curl -fsS "${health_url}" >/dev/null 2>&1; then
        log_success "${name} 健康检查通过"
    else
        log_warning "${name} 健康检查未通过，请查看日志"
    fi
}

start_service() {
    local index=$1
    local key=${SERVICE_KEYS[$index]}
    local name=${SERVICE_NAMES[$index]}
    local service_dir=${SERVICE_DIRS[$index]}
    local command_line=${SERVICE_COMMANDS[$index]}
    local port=${SERVICE_PORTS[$index]}
    local health_url=${SERVICE_HEALTH_URLS[$index]}
    local timeout=${SERVICE_START_TIMEOUTS[$index]}
    local pid_file
    local log_file

    pid_file=$(pid_file_for "$key")
    log_file=$(log_file_for "$key")

    if [[ -z "${command_line}" ]]; then
        log_error "${name} 未配置启动命令"
        print_manual_config_items
        exit 1
    fi

    if [[ -f "${pid_file}" ]] && check_process "$(cat "${pid_file}")"; then
        log_warning "${name} 已在运行，PID: $(cat "${pid_file}")"
        return 0
    fi

    log_step "启动 ${name}"
    mkdir -p "$(dirname "${log_file}")"

    (
        cd "$ROOT_DIR/${service_dir}"
        nohup bash -lc "${command_line}" >"${log_file}" 2>&1 &
        echo $! >"${pid_file}"
    )

    local pid
    pid=$(cat "${pid_file}")
    log_info "${name} PID: ${pid}"
    log_info "${name} 日志: ${log_file}"

    wait_for_port "${port}" "${name}" "${timeout}"
    run_health_check "${name}" "${health_url}"
}

stop_process() {
    local pid=$1
    local name=$2
    local timeout=10
    local count=0

    if ! check_process "${pid}"; then
        log_info "${name} 进程不存在，PID: ${pid}"
        return 0
    fi

    log_step "停止 ${name}，PID: ${pid}"
    kill -TERM "${pid}" 2>/dev/null || true

    while [[ ${count} -lt ${timeout} ]]; do
        if ! check_process "${pid}"; then
            log_success "${name} 已停止"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done

    log_warning "${name} 未正常退出，执行强制停止"
    kill -KILL "${pid}" 2>/dev/null || true
}

stop_service() {
    local index=$1
    local key=${SERVICE_KEYS[$index]}
    local name=${SERVICE_NAMES[$index]}
    local port=${SERVICE_PORTS[$index]}
    local pid_file

    pid_file=$(pid_file_for "$key")

    if [[ -f "${pid_file}" ]]; then
        stop_process "$(cat "${pid_file}")" "${name}"
        rm -f "${pid_file}"
    else
        log_info "未找到 ${name} PID 文件"
    fi

    if [[ -n "${port}" ]] && command -v lsof >/dev/null 2>&1; then
        local residual_pids
        residual_pids=$(lsof -ti :"${port}" 2>/dev/null || true)
        if [[ -n "$residual_pids" ]]; then
            local residual_pid
            for residual_pid in $residual_pids; do
                stop_process "$residual_pid" "${name} 残留进程"
            done
        fi
    fi
}

do_setup() {
    print_banner
    prepare_runtime_dirs
    check_dependencies
    copy_environment_template
    run_setup_commands
    print_manual_config_items
    log_success "首次环境准备完成"
}

do_doctor() {
    print_banner
    local failed=0

    prepare_runtime_dirs
    doctor_check_dependencies || failed=1
    check_environment_files
    doctor_check_environment || failed=1
    print_manual_config_items

    echo "运行态目录: $RUNTIME_DIR"
    echo "日志目录: $LOG_DIR"
    echo "PID 目录: $PID_DIR"

    if [[ "${failed}" -eq 0 ]]; then
        log_success "检查通过"
    else
        log_error "检查发现问题，请按上方提示补齐"
        return 1
    fi
}

do_start() {
    print_banner
    prepare_runtime_dirs
    check_dependencies

    if [[ "$START_AUTO_SETUP" == "true" ]]; then
        copy_environment_template
        run_setup_commands
    fi

    load_environment
    check_environment_files
    check_required_env_vars
    check_auth_config
    check_storage_config
    print_manual_config_items
    ensure_no_conflict

    for index in "${!SERVICE_KEYS[@]}"; do
        start_service "$index"
    done

    do_status
}

do_stop() {
    prepare_runtime_dirs
    for index in "${!SERVICE_KEYS[@]}"; do
        stop_service "$index"
    done
    log_success "本地服务已停止"
}

do_restart() {
    do_stop
    log_info "等待端口释放"
    sleep 2
    do_start
}

do_status() {
    prepare_runtime_dirs
    echo
    echo -e "${CYAN}服务状态:${NC}"

    for index in "${!SERVICE_KEYS[@]}"; do
        local key=${SERVICE_KEYS[$index]}
        local name=${SERVICE_NAMES[$index]}
        local port=${SERVICE_PORTS[$index]}
        local pid_file
        pid_file=$(pid_file_for "$key")

        if [[ -f "${pid_file}" ]] && check_process "$(cat "${pid_file}")"; then
            if [[ -n "${port}" ]]; then
                echo -e "  ${GREEN}*${NC} ${name}: ${GREEN}运行中${NC}，PID $(cat "${pid_file}")，端口 ${port}"
            else
                echo -e "  ${GREEN}*${NC} ${name}: ${GREEN}运行中${NC}，PID $(cat "${pid_file}")"
            fi
        else
            echo -e "  ${RED}*${NC} ${name}: ${RED}未运行${NC}"
        fi
    done

    echo
    print_service_urls
    echo "运行态目录: $RUNTIME_DIR"
    echo
}

do_logs() {
    prepare_runtime_dirs

    local log_files=()
    local key
    for key in "${SERVICE_KEYS[@]}"; do
        local log_file
        log_file=$(log_file_for "$key")
        touch "${log_file}"
        log_files+=("${log_file}")
    done

    log_info "正在追踪日志，按 Ctrl+C 退出"
    tail -f "${log_files[@]}"
}

do_free_port() {
    local target_port=${1:-}
    local yes_flag=${2:-}
    local failed=0

    if [[ -n "${target_port}" ]]; then
        free_one_port "${target_port}" "${yes_flag}" || failed=1
    else
        local found_port=false
        local port
        while IFS= read -r port; do
            found_port=true
            free_one_port "${port}" "${yes_flag}" || failed=1
        done < <(unique_service_ports)

        if [[ "$found_port" == false ]]; then
            log_warning "服务配置中没有可处理的端口"
        fi
    fi

    return "${failed}"
}

main() {
    if [[ $# -eq 0 ]]; then
        interactive_menu
        return 0
    fi

    local command=$1

    case "${command}" in
        setup)
            do_setup
            ;;
        doctor)
            do_doctor
            ;;
        start)
            do_start
            ;;
        stop)
            do_stop
            ;;
        restart)
            do_restart
            ;;
        status)
            do_status
            ;;
        logs)
            do_logs
            ;;
        free-port|freeport|port)
            do_free_port "${2:-}" "${3:-}"
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            log_error "未知命令: ${command}"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
