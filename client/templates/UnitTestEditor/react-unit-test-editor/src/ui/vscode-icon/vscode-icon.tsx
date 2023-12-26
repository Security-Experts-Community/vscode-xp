type Props = {
    variant: string;
};

export default function VscodeIcon({ variant }: Props) {
    return (
        <span className="icon !h-fit">
            <i className={`codicon codicon-${variant}`}></i>
        </span>
    );
}
