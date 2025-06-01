import subprocess
import shlex
import logging
import os
from typing import Tuple, Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import exc as sqlalchemy_exc

from . import models, schemas
from .proxmox import proxmox_service

logger = logging.getLogger(__name__)

IPTABLES_COMMAND = "iptables"

def _run_command(command_parts: List[str], timeout: int = 15) -> Tuple[bool, str]:
    try:
        env_vars = os.environ.copy()
        env_vars['LC_ALL'] = 'C.UTF-8'
        env_vars['LANG'] = 'C.UTF-8'
        log_command = ' '.join(shlex.quote(part) for part in command_parts)
        logger.info(f"执行命令: {log_command}")
        
        result = subprocess.run(
            command_parts,
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout,
            env=env_vars
        )
        
        if result.returncode != 0:
            error_message = result.stderr.strip() if result.stderr else result.stdout.strip()
            logger.error(f"命令执行失败 (退出码 {result.returncode}): {log_command}\n错误: {error_message}")
            return False, error_message
        else:
            logger.info(f"命令执行成功: {log_command}\n输出: {result.stdout.strip()}")
            return True, result.stdout.strip()
            
    except FileNotFoundError:
        command_name = command_parts[0] if command_parts else '命令'
        logger.error(f"命令未找到: {command_name}")
        return False, f"命令 '{command_name}' 未找到。请确保其已安装并在系统 PATH 中。"
    except subprocess.TimeoutExpired:
        log_command_str = ' '.join(shlex.quote(part) for part in command_parts)
        logger.error(f"命令执行超时 (>{timeout}s): {log_command_str}")
        return False, f"命令执行超时 (>{timeout}秒)。"
    except Exception as e:
        logger.error(f"执行命令时发生未知异常: {e}")
        return False, f"执行命令时发生未知异常: {str(e)}"

def _apply_iptables_rule(rule: models.NatRule, add: bool = True) -> Tuple[bool, str]:
    action = '-A' if add else '-D'
    action_desc = "添加" if add else "删除"
    
    desc_part_for_comment = ""
    if rule.description:
        sane_desc = rule.description.replace('"', "'").replace(";", "_") 
        max_desc_len = 180 
        if len(sane_desc) > max_desc_len:
            sane_desc = sane_desc[:max_desc_len-3] + "..."
        desc_part_for_comment = f";desc={sane_desc}"

    generated_comment = f"pve-lxc-server:id={rule.id};node={rule.node};vmid={rule.vmid}{desc_part_for_comment}"
    
    if len(generated_comment) > 255:
        base_comment_part = f"pve-lxc-server:id={rule.id};node={rule.node};vmid={rule.vmid}"
        if len(base_comment_part) <=255:
            generated_comment = base_comment_part
        else: # Should not happen if IDs/node/vmid names are reasonable
            generated_comment = base_comment_part[:252] + "..."


    iptables_cmd = [
        IPTABLES_COMMAND, '-t', 'nat', action, 'PREROUTING',
        '-p', rule.protocol,
        '--dport', str(rule.host_port),
        '-j', 'DNAT',
        '--to-destination', f"{rule.container_ip_at_creation}:{rule.container_port}",
        '-m', 'comment', '--comment', generated_comment
    ]

    success, output = _run_command(iptables_cmd)
    if not success:
        logger.error(f"{action_desc} iptables 规则失败 (ID: {rule.id}): {output}")
        return False, f"iptables {action_desc}操作失败: {output}"
    
    logger.info(f"成功{action_desc} iptables 规则 (ID: {rule.id})")
    return True, f"iptables 规则已成功{action_desc}。"

def get_nat_rule_by_id(db: Session, rule_id: int) -> Optional[models.NatRule]:
    return db.query(models.NatRule).filter(models.NatRule.id == rule_id).first()

def get_nat_rules_for_container(db: Session, node: str, vmid: int, skip: int = 0, limit: int = 100) -> Tuple[List[models.NatRule], int]:
    query = db.query(models.NatRule).filter(models.NatRule.node == node, models.NatRule.vmid == vmid)
    total = query.count()
    rules = query.order_by(models.NatRule.id.desc()).offset(skip).limit(limit).all()
    return rules, total

def get_all_nat_rules(db: Session, skip: int = 0, limit: int = 100) -> Tuple[List[models.NatRule], int]:
    query = db.query(models.NatRule)
    total = query.count()
    rules = query.order_by(models.NatRule.id.desc()).offset(skip).limit(limit).all()
    return rules, total

def check_host_port_conflict(db: Session, host_port: int, protocol: str, rule_id_to_exclude: Optional[int] = None) -> bool:
    query = db.query(models.NatRule).filter(
        models.NatRule.host_port == host_port,
        models.NatRule.protocol == protocol,
        models.NatRule.enabled == True
    )
    if rule_id_to_exclude:
        query = query.filter(models.NatRule.id != rule_id_to_exclude)
    return query.first() is not None

def create_nat_rule(db: Session, node: str, vmid: int, rule_create: schemas.NatRuleCreate) -> Tuple[Optional[models.NatRule], str]:
    if check_host_port_conflict(db, rule_create.host_port, rule_create.protocol):
        return None, f"主机端口 {rule_create.host_port}/{rule_create.protocol} 已被占用。"

    container_ip = proxmox_service.get_container_ip(node, vmid)
    if not container_ip:
        return None, f"无法获取容器 {node}/{vmid} 的 IP 地址。请确保容器正在运行且已配置网络。"

    container_status_info = proxmox_service.get_container_status(node, str(vmid))
    if not container_status_info or container_status_info.get('status') != 'running':
         return None, f"容器 {node}/{vmid} 未运行或无法获取状态，无法添加NAT规则。"


    db_rule = models.NatRule(
        node=node,
        vmid=vmid,
        host_port=rule_create.host_port,
        container_port=rule_create.container_port,
        protocol=rule_create.protocol.lower(),
        container_ip_at_creation=container_ip,
        description=rule_create.description,
        enabled=True 
    )

    try:
        db.add(db_rule)
        db.commit()
        db.refresh(db_rule)
    except sqlalchemy_exc.IntegrityError as e:
        db.rollback()
        logger.error(f"数据库唯一约束冲突: {e}")
        return None, f"创建NAT规则失败：主机端口 {rule_create.host_port}/{rule_create.protocol} 可能已存在。"
    except Exception as e:
        db.rollback()
        logger.error(f"数据库操作失败: {e}")
        return None, f"创建NAT规则时发生数据库错误: {str(e)}"

    iptables_success, iptables_msg = _apply_iptables_rule(db_rule, add=True)
    if not iptables_success:
        logger.warning(f"iptables规则添加失败，但数据库记录已创建 (ID: {db_rule.id})。将禁用该规则。")
        db_rule.enabled = False
        try:
            db.commit()
            db.refresh(db_rule)
        except Exception as e_db_update:
            db.rollback()
            logger.error(f"禁用规则(ID: {db_rule.id})时数据库更新失败: {e_db_update}")
            return db_rule, f"NAT规则已记录到数据库但iptables应用失败，且禁用规则时出错: {iptables_msg}。请手动检查。"

        return db_rule, f"NAT规则已记录到数据库但iptables应用失败: {iptables_msg}。规则已在数据库中标记为禁用。"
    
    return db_rule, "NAT 规则已成功创建并应用。"

def update_nat_rule(db: Session, rule_id: int, rule_update: schemas.NatRuleUpdate) -> Tuple[Optional[models.NatRule], str]:
    db_rule = get_nat_rule_by_id(db, rule_id)
    if not db_rule:
        return None, "未找到指定的 NAT 规则。"

    old_host_port = db_rule.host_port
    old_protocol = db_rule.protocol
    old_enabled_state = db_rule.enabled
    old_container_ip = db_rule.container_ip_at_creation
    old_container_port = db_rule.container_port
    old_description = db_rule.description # For constructing old comment

    update_data = rule_update.model_dump(exclude_unset=True)
    
    if 'host_port' in update_data or 'protocol' in update_data:
        new_host_port = update_data.get('host_port', db_rule.host_port)
        new_protocol = update_data.get('protocol', db_rule.protocol).lower()
        if (new_host_port != db_rule.host_port or new_protocol != db_rule.protocol) and \
           check_host_port_conflict(db, new_host_port, new_protocol, rule_id_to_exclude=rule_id):
            return None, f"更新失败：目标主机端口 {new_host_port}/{new_protocol} 已被占用。"

    changed_networking_params = False
    if 'host_port' in update_data and update_data['host_port'] != db_rule.host_port: changed_networking_params = True
    if 'protocol' in update_data and update_data['protocol'].lower() != db_rule.protocol: changed_networking_params = True
    if 'container_port' in update_data and update_data['container_port'] != db_rule.container_port: changed_networking_params = True
    
    new_enabled_state = update_data.get('enabled', db_rule.enabled)

    # Create a temporary NatRule object representing the rule *as it was in iptables* for accurate deletion
    temp_old_rule_for_iptables = models.NatRule(
        id=db_rule.id, host_port=old_host_port, protocol=old_protocol, 
        container_ip_at_creation=old_container_ip, container_port=old_container_port,
        node=db_rule.node, vmid=db_rule.vmid, description=old_description 
    )


    iptables_delete_success = True
    iptables_delete_msg = ""
    if old_enabled_state and (changed_networking_params or not new_enabled_state):
        iptables_delete_success, iptables_delete_msg = _apply_iptables_rule(temp_old_rule_for_iptables, add=False)
        if not iptables_delete_success:
            logger.error(f"更新规则 (ID: {db_rule.id}) 时，旧iptables规则删除失败: {iptables_delete_msg}")


    for key, value in update_data.items():
        if key == "protocol" and value is not None:
            setattr(db_rule, key, value.lower())
        elif value is not None: # Also handles 'enabled' if present in update_data
            setattr(db_rule, key, value)
    
    try:
        db.commit()
        db.refresh(db_rule)
    except sqlalchemy_exc.IntegrityError:
        db.rollback()
        return None, f"更新NAT规则失败：主机端口 {db_rule.host_port}/{db_rule.protocol} 可能已存在。"
    except Exception as e:
        db.rollback()
        return None, f"更新NAT规则时发生数据库错误: {str(e)}"

    iptables_add_success = True
    iptables_add_msg = ""
    if new_enabled_state and (changed_networking_params or (not old_enabled_state and new_enabled_state)):
        
        # If critical network params changed or rule is being re-enabled, ensure IP is fresh
        if db_rule.enabled: 
            container_ip = proxmox_service.get_container_ip(db_rule.node, db_rule.vmid)
            if not container_ip:
                db_rule.enabled = False 
                db.commit()
                db.refresh(db_rule)
                return db_rule, f"NAT规则已更新但无法获取容器最新IP，规则已被禁用。"
            
            if db_rule.container_ip_at_creation != container_ip:
                 logger.info(f"容器 {db_rule.node}/{db_rule.vmid} IP 从 {db_rule.container_ip_at_creation} 变为 {container_ip}。更新规则 (ID: {db_rule.id}) 中记录的IP。")
                 db_rule.container_ip_at_creation = container_ip
                 db.commit() # Commit IP change before applying rule
                 db.refresh(db_rule)


        iptables_add_success, iptables_add_msg = _apply_iptables_rule(db_rule, add=True) # db_rule now has potentially updated IP
        if not iptables_add_success:
            logger.error(f"更新规则 (ID: {db_rule.id}) 时，新iptables规则添加失败: {iptables_add_msg}")
            db_rule.enabled = False 
            db.commit()
            db.refresh(db_rule)
            return db_rule, f"NAT规则已更新但新的iptables规则应用失败，规则已被禁用。旧规则删除状态: {iptables_delete_msg}"

    final_message = f"NAT 规则 (ID: {db_rule.id}) 已成功更新。"
    if not iptables_delete_success:
        final_message += f" 注意：旧iptables规则删除可能失败: {iptables_delete_msg}。"
    if db_rule.enabled and not iptables_add_success and (changed_networking_params or (not old_enabled_state and new_enabled_state)): # Only mention add failure if it was attempted
         final_message += f" 注意：新iptables规则应用失败，规则已被禁用: {iptables_add_msg}。"
            
    return db_rule, final_message


def delete_nat_rule(db: Session, rule_id: int) -> Tuple[bool, str]:
    db_rule = get_nat_rule_by_id(db, rule_id)
    if not db_rule:
        return False, "未找到指定的 NAT 规则。"

    iptables_success = True # Assume success if rule is not enabled
    iptables_msg = "规则未启用，无需操作iptables。"

    if db_rule.enabled:
        iptables_success, iptables_msg = _apply_iptables_rule(db_rule, add=False)
        if not iptables_success:
            logger.warning(f"iptables 规则删除失败 (ID: {db_rule.id})，但仍将从数据库中删除记录: {iptables_msg}")
    
    try:
        db.delete(db_rule)
        db.commit()
    except Exception as e:
        db.rollback()
        return False, f"从数据库删除NAT规则时发生错误: {str(e)}"

    msg = f"NAT 规则 (ID: {rule_id}) 已成功从数据库删除。"
    if db_rule.enabled and not iptables_success:
        msg += f" 注意：对应的iptables规则删除失败: {iptables_msg}。可能需要手动清理。"
    elif db_rule.enabled and iptables_success:
        msg += " 对应的iptables规则也已尝试删除。"
        
    return True, msg

def resync_all_iptables_rules(db: Session) -> Tuple[bool, str, Dict[str, Any]]:
    logger.info("开始重新同步所有NAT规则到iptables...")
    
    comment_prefix_to_clear = "pve-lxc-server:" # This must match what _apply_iptables_rule generates
    clear_cmd_parts = [
        IPTABLES_COMMAND, '-t', 'nat', '-S', 'PREROUTING'
    ]
    list_success, current_rules_str = _run_command(clear_cmd_parts)
    if not list_success:
        return False, f"无法列出现有PREROUTING规则: {current_rules_str}", {}

    delete_commands = []
    for line in current_rules_str.splitlines():
        # Ensure we are matching rules added by this service based on the comment
        # The comment format is "pve-lxc-server:id=..."
        if f'-m comment --comment "{comment_prefix_to_clear}' in line and line.startswith("-A PREROUTING"):
            delete_cmd_str = line.replace("-A PREROUTING", "-D PREROUTING", 1)
            # shlex.split needs careful handling if parts of the rule can be complex.
            # For standard iptables -S output, this should generally be okay.
            try:
                delete_cmd_parts = [IPTABLES_COMMAND, '-t', 'nat'] + shlex.split(delete_cmd_str)
                delete_commands.append(delete_cmd_parts)
            except ValueError as e:
                logger.error(f"解析规则行失败: {line} - 错误: {e}")
                continue


    cleared_count = 0
    failed_clear_count = 0
    # Delete in reverse order of how -S lists them (usually not critical, but safer)
    # Or delete in reverse order of typical addition (if that was tracked, but it's not)
    # For -D, order doesn't strictly matter as long as the rule matches exactly.
    for cmd in delete_commands: 
        del_success, del_out = _run_command(cmd)
        if del_success:
            cleared_count += 1
        else:
            failed_clear_count += 1
            logger.warning(f"重新同步时，删除旧iptables规则失败: {' '.join(cmd)} - {del_out}")
    
    logger.info(f"重新同步：清除了 {cleared_count} 条旧规则，{failed_clear_count} 条删除失败。")

    db_rules = db.query(models.NatRule).filter(models.NatRule.enabled == True).all()
    applied_count = 0
    failed_apply_count = 0
    rules_disabled_due_to_error = []

    for db_rule in db_rules:
        container_ip = proxmox_service.get_container_ip(db_rule.node, db_rule.vmid)
        if not container_ip:
            logger.warning(f"重新同步：无法获取容器 {db_rule.node}/{db_rule.vmid} 的IP地址，跳过规则 ID {db_rule.id} 并将其在数据库中禁用。")
            db_rule.enabled = False # Mark for update in DB
            rules_disabled_due_to_error.append(db_rule.id)
            continue 
        
        if db_rule.container_ip_at_creation != container_ip:
            logger.info(f"重新同步：容器 {db_rule.node}/{db_rule.vmid} 的IP地址已从 {db_rule.container_ip_at_creation} 变更为 {container_ip}。更新规则 ID {db_rule.id} 中记录的IP。")
            db_rule.container_ip_at_creation = container_ip # Mark for update in DB
        
        iptables_success, _ = _apply_iptables_rule(db_rule, add=True)
        if iptables_success:
            applied_count += 1
        else:
            failed_apply_count += 1
            logger.error(f"重新同步：应用规则 ID {db_rule.id} 失败，将在数据库中禁用。")
            db_rule.enabled = False # Mark for update in DB
            rules_disabled_due_to_error.append(db_rule.id)
    
    try:
        db.commit() # Commit all changes (enabled status, IP updates)
    except Exception as e:
        db.rollback()
        logger.error(f"重新同步期间提交数据库更改失败: {e}")
        # Construct stats before returning to reflect attempted operations
        stats_on_error = {
            "cleared_rules": cleared_count,
            "failed_to_clear_rules": failed_clear_count,
            "attempted_to_apply_rules": len(db_rules), # Number of rules iterated for application
            "successfully_applied_rules": applied_count,
            "failed_to_apply_rules": failed_apply_count,
            "rules_marked_for_disable_ids": list(set(rules_disabled_due_to_error))
        }
        return False, f"重新同步部分成功，但最终数据库更新失败: {e}", stats_on_error
        
    stats = {
        "cleared_rules": cleared_count,
        "failed_to_clear_rules": failed_clear_count,
        "applied_rules": applied_count,
        "failed_to_apply_rules": failed_apply_count,
        "rules_disabled_due_to_error_ids": list(set(rules_disabled_due_to_error))
    }
    
    message = (
        f"重新同步完成。清除了 {cleared_count} 条旧规则 ({failed_clear_count}条失败)。"
        f"应用了 {applied_count} 条新规则 ({failed_apply_count}条失败)。"
        f"{len(stats['rules_disabled_due_to_error_ids'])} 条规则因错误被禁用。"
    )
    logger.info(message)
    return True, message, stats
