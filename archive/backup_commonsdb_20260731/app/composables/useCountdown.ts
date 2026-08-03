export default function (opts: {
  timeInSeconds: number;
  onFinish?: () => any;
}) {
  const initialTime = opts.timeInSeconds ?? 10;
  const timeElapsed = ref(0);
  let timer: any = null;

  const countdown = computed(() => initialTime - timeElapsed.value);

  const start = () => {
    timer = setInterval(() => timeElapsed.value++, 1000);
  };

  watch(countdown, (val) => {
    if (val === 0) {
      clearInterval(timer);
      if (opts.onFinish) {
        opts.onFinish();
      }
    }
  });

  return {
    countdown,
    start,
  };
}
