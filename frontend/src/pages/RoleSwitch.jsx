import { Segmented } from 'antd';
import { UserOutlined, CommentOutlined, TeamOutlined } from '@ant-design/icons';

const roles = [
  { label: '顾问', value: 'consultant', icon: <UserOutlined /> },
  { label: '老师', value: 'teacher', icon: <CommentOutlined /> },
  { label: '教务', value: 'admin', icon: <TeamOutlined /> },
];

export default function RoleSwitch({ role, onRoleChange }) {
  return (
    <Segmented
      value={role}
      onChange={onRoleChange}
      options={roles.map(r => ({ label: r.label, value: r.value }))}
    />
  );
}
