import {requirePageAuth} from '@/lib/auth';import WorkspaceNav from '@/components/workspace-nav';
export default async function WorkspaceLayout({children}:{children:React.ReactNode}){await requirePageAuth();return <div className="appShell"><WorkspaceNav/><div className="appBody"><div className="mobileBrand">个人工作台</div><main className="pageContent">{children}</main></div></div>}
