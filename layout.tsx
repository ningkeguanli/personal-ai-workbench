import './globals.css';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'个人工作台',description:'个人工作、客户、项目与能力成长'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
